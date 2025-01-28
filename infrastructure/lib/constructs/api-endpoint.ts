import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { Construct } from "constructs";

export interface ApiEndpointProps {
  domainName: string;
  environment: string;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  lambdaFunction: lambda.IFunction;
  apiName: string;
  allowOrigins: string[];
  rateLimitPerMinute?: number;
}

/**
 * Reusable construct for creating an API Gateway endpoint with custom domain,
 * Lambda integration, and DNS configuration
 */
export class ApiEndpoint extends Construct {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiEndpointProps) {
    super(scope, id);

    // Create Log Group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, "APIGatewayLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
    });

    // Create WAF ACL with security rules
    const webAcl = new wafv2.CfnWebACL(this, 'ApiWAFv2', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.environment}-api-waf-metrics`,
        sampledRequestsEnabled: true,
      },
      rules: [
        // Rate limiting rule
        {
          name: 'RateLimit',
          priority: 1,
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment}-rate-limit`,
            sampledRequestsEnabled: true,
          },
          statement: {
            rateBasedStatement: {
              aggregateKeyType: 'IP',
              limit: props.rateLimitPerMinute || 2000
            }
          }
        },
        // SQL injection protection
        {
          name: 'SQLInjectionProtection',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesSQLiRuleSet',
              vendorName: 'AWS'
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment}-sql-injection`,
            sampledRequestsEnabled: true,
          }
        },
        // Common attack patterns
        {
          name: 'CommonRules',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              name: 'AWSManagedRulesCommonRuleSet',
              vendorName: 'AWS'
            }
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment}-common-attacks`,
            sampledRequestsEnabled: true,
          }
        }
      ]
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, "Api", {
      restApiName: props.apiName,
      description: `API Gateway for ${props.apiName}`,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      domainName: {
        domainName: `api.${props.domainName}`,
        certificate: props.certificate,
        securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
      },
      deployOptions: {
        stageName: props.environment,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(
          apiLogGroup
        ),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        methodOptions: {
          '/*/*': {  // This applies to all resources and methods
            throttlingBurstLimit: Math.min(5000, props.rateLimitPerMinute || 2000),
            throttlingRateLimit: props.rateLimitPerMinute || 2000
          }
        }
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.allowOrigins,
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Create Lambda Integration
    const lambdaIntegration = new apigateway.LambdaIntegration(
      props.lambdaFunction,
      {
        proxy: true,
        allowTestInvoke: true,
      }
    );

    // Add proxy resource to forward all requests to Lambda
    this.api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // Create DNS record for the API
    new route53.ARecord(this, "APIRecord", {
      zone: props.hostedZone,
      recordName: `api.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(this.api.domainName!)
      ),
    });

    // Associate WAF web ACL with the API Gateway
    new wafv2.CfnWebACLAssociation(this, 'APIGatewayWAFAssociation', {
      resourceArn: this.api.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn
    });

    // Create health check endpoint
    const healthResource = this.api.root.addResource('health');
    const healthIntegration = new apigateway.LambdaIntegration(props.lambdaFunction, {
      proxy: true,
      requestTemplates: {
        'application/json': JSON.stringify({
          type: 'health-check'
        })
      }
    });

    healthResource.addMethod('GET', healthIntegration, {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '500',
          responseModels: {
            'application/json': apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Create CloudWatch alarm for health check
    new cloudwatch.Alarm(this, 'HealthCheckAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiName: this.api.restApiName,
          Resource: '/health',
          Method: 'GET',
          Stage: props.environment
        },
        period: cdk.Duration.minutes(1),
        statistic: 'Sum'
      }),
      threshold: 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Health Check failing',
    });

    // Add tags
    cdk.Tags.of(this).add("Feature", "ApiEndpoint");
  }
}

import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
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
            throttlingBurstLimit: Math.min(2000, props.rateLimitPerMinute || 1000),
            throttlingRateLimit: props.rateLimitPerMinute || 1000
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

    // Add security headers to all responses
    const responseParameters = {
      'method.response.header.Strict-Transport-Security': true,
      'method.response.header.X-Content-Type-Options': true,
      'method.response.header.X-Frame-Options': true,
    };

    // Apply security headers to all methods
    this.api.methods.forEach(method => {
      method.addMethodResponse({
        statusCode: '200',
        responseParameters,
      });
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

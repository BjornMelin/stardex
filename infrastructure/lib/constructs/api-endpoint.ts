import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface ApiEndpointProps {
  domainName: string;
  environment: string;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  lambdaFunction: lambda.IFunction;
  apiName: string;
  allowOrigins: string[];
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

    // Add tags
    cdk.Tags.of(this).add("Feature", "ApiEndpoint");
  }
}

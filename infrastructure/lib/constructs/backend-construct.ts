import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { BackendStackProps } from "../types/stack-props";
import { LambdaFunction } from "./lambda-function";
import { ApiEndpoint } from "./api-endpoint";

export class BackendConstruct extends Construct {
  public readonly api: cdk.aws_apigateway.RestApi;
  public readonly lambda: lambda.Function;

  constructor(
    scope: Construct,
    id: string,
    private readonly props: BackendStackProps
  ) {
    super(scope, id);

    // Create VPC for Lambda function with minimal NAT costs
    const vpc = new ec2.Vpc(this, "LambdaVPC", {
      maxAzs: 2,
      natGateways: 0, // Remove NAT Gateway to reduce costs
      subnetConfiguration: [
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Use isolated subnet since we don't need internet access
          cidrMask: 24,
        },
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // Create FastAPI Lambda function with VPC and Secrets
    const backendFunction = new LambdaFunction(this, "FastAPIFunction", {
      functionName: "stardex-backend",
      description: "FastAPI backend for Stardex application",
      environment: props.environment,
      codePath: "../backend",
      handler: "app.main.handler",
      runtime: lambda.Runtime.PYTHON_3_11,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      environment_vars: {
        CORS_ORIGINS: `https://${props.domainName}`,
      },
    });

    // Create API Gateway with Lambda integration
    const apiEndpoint = new ApiEndpoint(this, "API", {
      domainName: props.domainName,
      environment: props.environment,
      certificate: props.certificate,
      hostedZone: props.hostedZone,
      lambdaFunction: backendFunction.function,
      apiName: "Stardex API",
      allowOrigins: [
        `https://${props.domainName}`,
        "http://localhost:3000", // Allow localhost for development
      ],
    });

    this.api = apiEndpoint.api;
    this.lambda = backendFunction.function;

    // Add tags
    cdk.Tags.of(this).add("Stack", "Backend");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }
  }
}

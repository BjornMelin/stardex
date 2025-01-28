import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface LambdaFunctionProps {
  functionName: string;
  description: string;
  environment: string;
  codePath: string;
  handler: string;
  runtime: lambda.Runtime;
  memorySize?: number;
  timeout?: cdk.Duration;
  environment_vars?: { [key: string]: string };
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  secrets?: {
    [key: string]: secretsmanager.ISecret;
  };
}

/**
 * Reusable construct for creating Lambda functions with consistent configuration
 */
export class LambdaFunction extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id);

    // Create Lambda function
    this.function = new lambda.Function(this, "Function", {
      runtime: props.runtime,
      handler: props.handler,
      code: lambda.Code.fromAsset(props.codePath, {
        bundling: {
          image: props.runtime.bundlingImage,
          command: [
            "bash",
            "-c",
            "pip install -r requirements.txt -t /asset-output && cp -au . /asset-output",
          ],
        },
      }),
      functionName: `${props.environment}-${props.functionName}`,
      description: props.description,
      timeout: props.timeout || cdk.Duration.seconds(30),
      memorySize: props.memorySize || 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        PYTHONPATH: "/var/task",
        ENVIRONMENT: props.environment,
        ...props.environment_vars,
      },
      vpc: props.vpc,
      vpcSubnets: props.vpc && (props.vpcSubnets || {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }),
      securityGroups: props.vpc ? [
        new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
          vpc: props.vpc,
          description: `Security group for ${props.functionName} Lambda function`,
          allowAllOutbound: true
        })
      ] : undefined,
      tracing: lambda.Tracing.ACTIVE,
    });

    // Add Secrets Manager integration if secrets are provided
    if (props.secrets) {
      // Grant permissions to access secrets
      Object.values(props.secrets).forEach(secret => {
        secret.grantRead(this.function);
      });

      // Add environment variables for secret ARNs
      const secretEnvVars: { [key: string]: string } = {};
      Object.entries(props.secrets).forEach(([key, secret]) => {
        secretEnvVars[`${key}_SECRET_ARN`] = secret.secretArn;
      });

      // Add secret ARNs to environment variables
      this.function.addEnvironment('SECRETS_MANAGER_REGION', cdk.Stack.of(this).region);
      Object.entries(secretEnvVars).forEach(([key, value]) => {
        this.function.addEnvironment(key, value);
      });
    }

    // Add common Lambda CloudWatch metrics
    new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Errors",
      dimensionsMap: {
        FunctionName: this.function.functionName,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Duration",
      dimensionsMap: {
        FunctionName: this.function.functionName,
      },
      statistic: "Average",
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      dimensionsMap: {
        FunctionName: this.function.functionName,
      },
      statistic: "Sum",
      period: cdk.Duration.minutes(5),
    });

    // Add tags
    cdk.Tags.of(this).add("Feature", "Lambda");
    cdk.Tags.of(this).add("Function", props.functionName);
  }

  /**
   * Add permissions to the Lambda function
   */
  public addToRolePolicy(statement: iam.PolicyStatement): void {
    this.function.addToRolePolicy(statement);
  }

  /**
   * Grant invoke permissions to another principal
   */
  public grantInvoke(grantee: iam.IGrantable): void {
    this.function.grantInvoke(grantee);
  }
}

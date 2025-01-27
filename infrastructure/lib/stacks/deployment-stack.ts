import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { DeploymentStackProps } from "../types/stack-props";

export class DeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    super(scope, id, props);

    // GitHub Actions OIDC Provider
    const provider = new iam.OpenIdConnectProvider(this, "GitHubProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    // GitHub Actions Role
    const gitHubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      roleName: `${props.environment}-stardex-github-actions-role`,
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringLike: {
          "token.actions.githubusercontent.com:sub": "repo:BjornMelin/stardex:*",
        },
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        },
      }),
    });

    // Frontend deployment permissions
    const s3DeploymentPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject",
      ],
      resources: [props.bucket.bucketArn, `${props.bucket.bucketArn}/*`],
    });

    // CloudFront invalidation permissions
    const cloudFrontDeploymentPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations",
      ],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${props.distribution.distributionId}`,
      ],
    });

    // Backend deployment permissions
    const lambdaDeploymentPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:PublishVersion",
      ],
      resources: [`arn:aws:lambda:${this.region}:${this.account}:function:*-stardex-*`],
    });

    // API Gateway deployment permissions
    const apiGatewayDeploymentPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "apigateway:POST",
        "apigateway:GET",
        "apigateway:PUT",
        "apigateway:DELETE",
      ],
      resources: [
        `arn:aws:apigateway:${this.region}::/restapis/*`,
        `arn:aws:apigateway:${this.region}::/stages/*`,
        `arn:aws:apigateway:${this.region}::/deployments/*`,
      ],
    });

    // CloudFormation permissions for stack outputs
    const cloudFormationPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["cloudformation:DescribeStacks"],
      resources: [
        `arn:aws:cloudformation:${this.region}:${this.account}:stack/${this.stackName}/*`,
        `arn:aws:cloudformation:${this.region}:${this.account}:stack/prod-stardex-*/*`,
      ],
    });

    // Attach policies to role
    gitHubActionsRole.addToPolicy(s3DeploymentPolicy);
    gitHubActionsRole.addToPolicy(cloudFrontDeploymentPolicy);
    gitHubActionsRole.addToPolicy(lambdaDeploymentPolicy);
    gitHubActionsRole.addToPolicy(apiGatewayDeploymentPolicy);
    gitHubActionsRole.addToPolicy(cloudFormationPolicy);

    // Add tags
    cdk.Tags.of(this).add("Stack", "Deployment");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: gitHubActionsRole.roleArn,
      description: "ARN of the GitHub Actions IAM role",
      exportName: `${props.environment}-stardex-github-actions-role-arn`,
    });
  }
}

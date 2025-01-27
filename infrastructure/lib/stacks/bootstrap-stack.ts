import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { BaseStackProps } from "../types/stack-props";

/**
 * Bootstrap stack that creates the GitHub OIDC provider and required IAM roles
 * This should be deployed once before other stacks using administrator credentials
 */
export class BootstrapStack extends cdk.Stack {
  public readonly githubActionsRole: iam.Role;
  public readonly oidcProvider: iam.OpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);

    // Create OIDC Provider for GitHub Actions
    this.oidcProvider = new iam.OpenIdConnectProvider(this, "GitHubProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
    });

    // Create GitHub Actions Role
    this.githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      roleName: `${props.environment}-stardex-github-actions-role`,
      assumedBy: new iam.WebIdentityPrincipal(
        this.oidcProvider.openIdConnectProviderArn,
        {
          StringLike: {
            "token.actions.githubusercontent.com:sub":
              "repo:BjornMelin/stardex:*",
          },
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
        }
      ),
      description: "Role used by GitHub Actions for Stardex deployment",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add required permissions for CDK deployment
    this.githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:*",
          "s3:*",
          "cloudfront:*",
          "route53:*",
          "lambda:*",
          "apigateway:*",
          "acm:*",
          "cloudwatch:*",
          "logs:*",
          "iam:GetRole",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
        ],
        resources: ["*"],
      })
    );

    // Create SSM parameter for role ARN (can be used by other stacks)
    new ssm.StringParameter(this, "GitHubActionsRoleArnParam", {
      parameterName: `/${props.environment}/stardex/github-actions-role-arn`,
      description: "ARN of the GitHub Actions IAM role",
      stringValue: this.githubActionsRole.roleArn,
    });

    // Add tags to all resources
    const tags = {
      Project: "Stardex",
      Environment: props.environment,
      ManagedBy: "CDK",
      Repository: "BjornMelin/stardex",
      Service: "GitHub-Actions-OIDC",
      SecurityZone: "External-Auth",
      DataClassification: "Public",
      ComplianceScope: "CI-CD",
      Owner: "DevOps",
      CostCenter: "Engineering",
      MaintenanceWindow: "OnDemand",
      AutomationType: "GitHubActions",
      DeploymentPipeline: "Stardex-CICD",
    };

    // Apply tags to all resources in the stack
    for (const [key, value] of Object.entries(tags)) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "OIDCProviderArn", {
      value: this.oidcProvider.openIdConnectProviderArn,
      description: "GitHub OIDC Provider ARN",
      exportName: `${props.environment}-github-oidc-provider-arn`,
    });

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: this.githubActionsRole.roleArn,
      description: "GitHub Actions Role ARN",
      exportName: `${props.environment}-github-actions-role-arn`,
    });

    new cdk.CfnOutput(this, "RoleParameterName", {
      value: `/${props.environment}/stardex/github-actions-role-arn`,
      description: "SSM Parameter name for GitHub Actions Role ARN",
      exportName: `${props.environment}-github-actions-role-param`,
    });
  }
}

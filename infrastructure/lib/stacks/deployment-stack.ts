import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { DeploymentStackProps } from "../types/stack-props";

/**
 * Stack for deployment-specific resources and configurations
 * Note: GitHub OIDC and IAM roles are created by the bootstrap stack
 */
export class DeploymentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: DeploymentStackProps) {
    super(scope, id, props);

    // Allow CloudFront invalidations
    const cloudFrontPolicy = new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations",
      ],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${props.distribution.distributionId}`,
      ],
    });

    // Allow S3 deployment access
    const s3Policy = new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject",
      ],
      resources: [props.bucket.bucketArn, `${props.bucket.bucketArn}/*`],
    });

    // Create deployment group for application
    const deploymentGroup = new cdk.aws_iam.Group(this, "DeploymentGroup", {
      groupName: `${props.environment}-stardex-deployment`,
    });

    // Attach policies to the deployment group
    deploymentGroup.addToPolicy(cloudFrontPolicy);
    deploymentGroup.addToPolicy(s3Policy);

    // Add tags
    cdk.Tags.of(this).add("Stack", "Deployment");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "DeploymentGroupName", {
      value: deploymentGroup.groupName,
      description: "Name of the deployment IAM group",
      exportName: `${props.environment}-stardex-deployment-group`,
    });
  }
}

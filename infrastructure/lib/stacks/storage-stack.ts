import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";
import { StorageStackProps } from "../types/stack-props";
import { StaticWebsite } from "../constructs/static-website";

export class StorageStack extends cdk.Stack {
  public readonly bucket: s3.IBucket;
  public readonly distribution: cloudfront.IDistribution;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // Create static website with CloudFront and S3
    const website = new StaticWebsite(this, "Website", {
      domainName: props.domainName,
      environment: props.environment,
      certificate: props.certificate,
      hostedZone: props.hostedZone,
    });

    this.bucket = website.bucket;
    this.distribution = website.distribution;

    // Add tags
    cdk.Tags.of(this).add("Stack", "Storage");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: this.bucket.bucketName,
      description: "Website bucket name",
      exportName: `${props.environment}-stardex-website-bucket-name`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID",
      exportName: `${props.environment}-stardex-distribution-id`,
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain name",
      exportName: `${props.environment}-stardex-distribution-domain`,
    });
  }
}

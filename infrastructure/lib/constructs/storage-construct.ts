import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Construct } from "constructs";
import { StorageStackProps } from "../types/stack-props";
import { StaticWebsite } from "./static-website";

export class StorageConstruct extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly distribution: cloudfront.IDistribution;

  constructor(
    scope: Construct,
    id: string,
    private readonly props: StorageStackProps
  ) {
    super(scope, id);

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
  }
}

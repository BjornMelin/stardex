import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export interface StaticWebsiteProps {
  domainName: string;
  environment: string;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
}

/**
 * Reusable construct for creating a static website with S3, CloudFront, and Route53
 */
export class StaticWebsite extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly distribution: cloudfront.IDistribution;
  private readonly logsBucket: s3.IBucket;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // Website bucket
    this.bucket = new s3.Bucket(this, "WebsiteBucket", {
      bucketName: `${props.domainName}-${props.environment}-website`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
          noncurrentVersionTransitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7)
            }
          ],
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            }
          ],
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        }
      ],
    });

    // CloudFront logs bucket
    this.logsBucket = new s3.Bucket(this, "LogsBucket", {
      bucketName: `${props.domainName}-${props.environment}-logs`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [
        {
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(7)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30)
            }
          ],
          expiration: cdk.Duration.days(90),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        }
      ],
    });

    // Create Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "WebsiteOAI",
      {
        comment: `OAI for ${props.domainName}`,
      }
    );

    // Grant read permissions to CloudFront
    this.bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("*")],
        principals: [
          new cdk.aws_iam.CanonicalUserPrincipal(
            originAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        // @ts-ignore - False positive deprecation warning, S3Origin is still the recommended approach
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: this.createCachePolicy(),
        responseHeadersPolicy: this.createSecurityHeadersPolicy(),
      },
      domainNames: [props.domainName],
      certificate: props.certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket: this.logsBucket,
      logFilePrefix: "cdn-logs/",
    });

    // DNS record for the domain
    new route53.ARecord(this, "AliasRecord", {
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      zone: props.hostedZone,
    });

    // Add IPv6 support
    new route53.AaaaRecord(this, "AliasRecordIPv6", {
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      zone: props.hostedZone,
    });

    // Add tags
    cdk.Tags.of(this).add("Feature", "StaticWebsite");
  }

  private createCachePolicy(): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(this, "CachePolicy", {
      cachePolicyName: `${this.node.id}-${this.node.addr}`,
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.hours(1),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
  }

  private createSecurityHeadersPolicy(): cloudfront.ResponseHeadersPolicy {
    return new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
      responseHeadersPolicyName: `${this.node.id}-security-headers-${this.node.addr}`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: [
            "default-src 'self'",
            "img-src 'self' data: https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: cdk.Duration.days(730),
          includeSubdomains: true,
          preload: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true,
        },
      },
    });
  }
}

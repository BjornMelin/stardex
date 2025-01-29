import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export interface BaseStackProps extends cdk.StackProps {
  domainName: string;
  rootDomainName: string;
  environment: string;
  tags?: Record<string, string>;
}

export interface ParentStackProps extends BaseStackProps {
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  lambdaLayer?: lambda.ILayerVersion;
}

export interface DnsStackProps extends BaseStackProps {}

export interface StorageStackProps {
  domainName: string;
  rootDomainName: string;
  environment: string;
  tags?: Record<string, string>;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
}

export interface BackendStackProps {
  domainName: string;
  rootDomainName: string;
  environment: string;
  tags?: Record<string, string>;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  lambdaLayer?: lambda.ILayerVersion;
}

export interface DeploymentStackProps extends BaseStackProps {
  bucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
}

export interface MonitoringStackProps {
  domainName: string;
  rootDomainName: string;
  environment: string;
  tags?: Record<string, string>;
  bucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  lambda?: lambda.IFunction;
  api?: apigateway.RestApi;
}

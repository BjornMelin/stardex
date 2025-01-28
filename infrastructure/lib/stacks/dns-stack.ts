import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { DnsStackProps } from "../types/stack-props";

export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    // Look up existing hosted zone for root domain
    this.hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName: props.rootDomainName,
    });

    // Create certificate for the subdomain and api subdomain
    this.certificate = new acm.Certificate(this, "SiteCertificate", {
      domainName: props.domainName,
      subjectAlternativeNames: [`api.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // Add tags
    cdk.Tags.of(this).add("Stack", "DNS");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "CertificateArn", {
      value: this.certificate.certificateArn,
      description: "SSL Certificate ARN",
      exportName: `${props.environment}-stardex-certificate-arn`,
    });

    new cdk.CfnOutput(this, "HostedZoneId", {
      value: this.hostedZone.hostedZoneId,
      description: "Hosted Zone ID",
      exportName: `${props.environment}-stardex-hosted-zone-id`,
    });
  }
}

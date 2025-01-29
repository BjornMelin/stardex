import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { ParentStackProps } from "../types/stack-props";
import { StorageConstruct } from "../constructs/storage-construct";
import { BackendConstruct } from "../constructs/backend-construct";
import { MonitoringConstruct } from "../constructs/monitoring-construct";

export class ParentStack extends cdk.Stack {
  public readonly storageConstruct: StorageConstruct;
  public readonly monitoringConstruct: MonitoringConstruct;
  public readonly backendConstruct: BackendConstruct;

  constructor(scope: Construct, id: string, props: ParentStackProps) {
    super(scope, id, props);

    // Create the storage stack as a nested stack with proper scoping
    const storageNestedStack = new cdk.NestedStack(this, "StorageNested");
    this.storageConstruct = new StorageConstruct(
      storageNestedStack,
      "Storage",
      {
        domainName: props.domainName,
        rootDomainName: props.rootDomainName,
        environment: props.environment,
        certificate: props.certificate,
        hostedZone: props.hostedZone,
        tags: props.tags,
      }
    );

    // Create the backend stack as a nested stack with proper scoping
    const backendNestedStack = new cdk.NestedStack(this, "BackendNested");
    this.backendConstruct = new BackendConstruct(
      backendNestedStack,
      "Backend",
      {
        domainName: props.domainName,
        rootDomainName: props.rootDomainName,
        environment: props.environment,
        certificate: props.certificate,
        hostedZone: props.hostedZone,
        tags: props.tags,
        apiLayer: props.apiLayer,
        mlLayer: props.mlLayer,
      }
    );

    // Create the monitoring stack as a nested stack with proper scoping
    const monitoringNestedStack = new cdk.NestedStack(this, "MonitoringNested");
    this.monitoringConstruct = new MonitoringConstruct(
      monitoringNestedStack,
      "Monitoring",
      {
        domainName: props.domainName,
        rootDomainName: props.rootDomainName,
        environment: props.environment,
        bucket: this.storageConstruct.bucket,
        distribution: this.storageConstruct.distribution,
        lambda: this.backendConstruct.lambda,
        api: this.backendConstruct.api,
        tags: props.tags,
      }
    );

    // Create outputs in the parent stack
    new cdk.CfnOutput(this, "DashboardURL", {
      value: this.monitoringConstruct.dashboardUrl,
      description: "URL of the CloudWatch Dashboard",
      exportName: `${props.environment}-stardex-dashboard-url`,
    });

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.monitoringConstruct.alertTopicArn,
      description: "ARN of the SNS alert topic",
      exportName: `${props.environment}-stardex-alert-topic-arn`,
    });

    // Add tags
    cdk.Tags.of(this).add("Stack", "Parent");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }
  }
}

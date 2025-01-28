import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MonitoringStackProps } from "../types/stack-props";
import { MonitoringDashboard } from "./monitoring-dashboard";

export class MonitoringConstruct extends Construct {
  public readonly alertTopic: cdk.aws_sns.Topic;
  public readonly dashboardUrl: string;
  public readonly alertTopicArn: string;

  constructor(
    scope: Construct,
    id: string,
    private readonly props: MonitoringStackProps
  ) {
    super(scope, id);

    // Create monitoring dashboard and alarms
    const monitoring = new MonitoringDashboard(this, "Monitoring", {
      environment: props.environment,
      distribution: props.distribution,
      bucket: props.bucket,
      apiName: props.api?.restApiName,
      lambdaFunctionName: props.lambda?.functionName,
      alarmEmail: "bjornmelin16@gmail.com",
    });

    // Store alert topic for parent stack access
    this.alertTopic = monitoring.alertTopic;

    // Get region from stack scope
    const region = cdk.Stack.of(this).region;

    // Store URLs and ARNs for parent stack access
    this.dashboardUrl = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${props.environment}-dashboard`;
    this.alertTopicArn = monitoring.alertTopic.topicArn;

    // Add tags
    cdk.Tags.of(this).add("Stack", "Monitoring");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }
  }
}

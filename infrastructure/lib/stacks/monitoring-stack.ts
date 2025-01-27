import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MonitoringStackProps } from "../types/stack-props";
import { MonitoringDashboard } from "../constructs/monitoring-dashboard";

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
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

    // Add tags
    cdk.Tags.of(this).add("Stack", "Monitoring");
    cdk.Tags.of(this).add("Environment", props.environment);
    for (const [key, value] of Object.entries(props.tags || {})) {
      cdk.Tags.of(this).add(key, value);
    }

    // Outputs
    new cdk.CfnOutput(this, "DashboardURL", {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${props.environment}-dashboard`,
      description: "URL of the CloudWatch Dashboard",
      exportName: `${props.environment}-stardex-dashboard-url`,
    });

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: monitoring.alertTopic.topicArn,
      description: "ARN of the SNS alert topic",
      exportName: `${props.environment}-stardex-alert-topic-arn`,
    });
  }
}

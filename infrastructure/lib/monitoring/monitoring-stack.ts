import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { Environment } from "../types/environment";

export interface MonitoringStackProps extends cdk.StackProps {
  environment: Environment;
  service: ecs.FargateService;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  targetGroup: elbv2.ApplicationTargetGroup;
  alarmEmail?: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS topic for alarms
    const alarmTopic = new sns.Topic(this, "AlarmTopic", {
      displayName: `${props.environment.name}-alarms`,
    });

    // Add email subscription if provided
    if (props.alarmEmail) {
      alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(props.alarmEmail)
      );
    }

    // Create log group with retention
    const logGroup = new logs.LogGroup(this, "ServiceLogs", {
      retention: props.environment.monitoring.logRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // CPU Utilization Alarm
    const cpuUtilization = new cloudwatch.Metric({
      namespace: "AWS/ECS",
      metricName: "CPUUtilization",
      dimensionsMap: {
        ClusterName: props.service.cluster.clusterName,
        ServiceName: props.service.serviceName,
      },
      period: cdk.Duration.minutes(1),
      statistic: "Average",
    });

    new cloudwatch.Alarm(this, "CPUUtilizationAlarm", {
      metric: cpuUtilization,
      threshold: props.environment.monitoring.alarmThresholdPercent,
      evaluationPeriods: props.environment.monitoring.alarmEvaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "CPU utilization is too high",
      actionsEnabled: true,
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // Memory Utilization Alarm
    const memoryUtilization = new cloudwatch.Metric({
      namespace: "AWS/ECS",
      metricName: "MemoryUtilization",
      dimensionsMap: {
        ClusterName: props.service.cluster.clusterName,
        ServiceName: props.service.serviceName,
      },
      period: cdk.Duration.minutes(1),
      statistic: "Average",
    });

    new cloudwatch.Alarm(this, "MemoryUtilizationAlarm", {
      metric: memoryUtilization,
      threshold: props.environment.monitoring.alarmThresholdPercent,
      evaluationPeriods: props.environment.monitoring.alarmEvaluationPeriods,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "Memory utilization is too high",
      actionsEnabled: true,
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // HTTP 5XX Error Rate Alarm
    const http5xxErrorRate = new cloudwatch.Metric({
      namespace: "AWS/ApplicationELB",
      metricName: "HTTPCode_Target_5XX_Count",
      dimensionsMap: {
        LoadBalancer: props.loadBalancer.loadBalancerFullName,
      },
      period: cdk.Duration.minutes(1),
      statistic: "Sum",
    });

    new cloudwatch.Alarm(this, "HTTP5XXErrorAlarm", {
      metric: http5xxErrorRate,
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "Too many 5XX errors",
      actionsEnabled: true,
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // Target Response Time Alarm
    const targetResponseTime = new cloudwatch.Metric({
      namespace: "AWS/ApplicationELB",
      metricName: "TargetResponseTime",
      dimensionsMap: {
        LoadBalancer: props.loadBalancer.loadBalancerFullName,
      },
      period: cdk.Duration.minutes(1),
      statistic: "Average",
    });

    new cloudwatch.Alarm(this, "HighLatencyAlarm", {
      metric: targetResponseTime,
      threshold: 2,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "API latency is too high",
      actionsEnabled: true,
    }).addAlarmAction(new actions.SnsAction(alarmTopic));

    // Create Dashboard
    const dashboard = new cloudwatch.Dashboard(this, "ServiceDashboard", {
      dashboardName: `${props.environment.name}-service-metrics`,
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "CPU and Memory Utilization",
        left: [cpuUtilization],
        right: [memoryUtilization],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "HTTP Errors and Latency",
        left: [http5xxErrorRate],
        right: [targetResponseTime],
        width: 12,
      })
    );

    // Health Check Configuration
    const healthCheck = props.loadBalancer.addListener("HealthCheckListener", {
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultAction: elbv2.ListenerAction.fixedResponse(200, {
        contentType: "text/plain",
        messageBody: "OK",
      }),
    });

    // Configure health check on the target group
    props.targetGroup.configureHealthCheck({
      path: "/health",
      healthyHttpCodes: "200",
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    // Outputs
    new cdk.CfnOutput(this, "LogGroupName", {
      value: logGroup.logGroupName,
      description: "CloudWatch Log Group Name",
    });

    new cdk.CfnOutput(this, "DashboardURL", {
      value: `https://${
        cdk.Stack.of(this).region
      }.console.aws.amazon.com/cloudwatch/home?region=${
        cdk.Stack.of(this).region
      }#dashboards:name=${dashboard.dashboardName}`,
      description: "CloudWatch Dashboard URL",
    });
  }
}

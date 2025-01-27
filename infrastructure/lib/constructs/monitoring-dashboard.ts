import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface MonitoringDashboardProps {
  environment: string;
  distribution?: cloudfront.IDistribution;
  bucket?: s3.IBucket;
  apiName?: string;
  lambdaFunctionName?: string;
  alarmEmail: string;
}

/**
 * Reusable construct for creating CloudWatch dashboards and alarms
 */
export class MonitoringDashboard extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringDashboardProps) {
    super(scope, id);

    // Create SNS topic for alerts
    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      displayName: `${props.environment}-alerts`,
      topicName: `${props.environment}-alerts`,
    });

    // Add email subscription
    this.alertTopic.addSubscription(
      new subscriptions.EmailSubscription(props.alarmEmail)
    );

    // Create Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${props.environment}-dashboard`,
    });

    const widgets: cloudwatch.IWidget[] = [];

    // Add CloudFront metrics if distribution is provided
    if (props.distribution) {
      const errorRate = new cloudwatch.Metric({
        namespace: "AWS/CloudFront",
        metricName: "5xxErrorRate",
        dimensionsMap: {
          DistributionId: props.distribution.distributionId,
          Region: "Global",
        },
        statistic: "Average",
        period: cdk.Duration.minutes(5),
      });

      const requests = new cloudwatch.Metric({
        namespace: "AWS/CloudFront",
        metricName: "Requests",
        dimensionsMap: {
          DistributionId: props.distribution.distributionId,
          Region: "Global",
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });

      widgets.push(
        new cloudwatch.GraphWidget({
          title: "CloudFront Error Rate",
          left: [errorRate],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: "Request Count",
          left: [requests],
          width: 12,
        })
      );

      // Create CloudFront alarm
      new cloudwatch.Alarm(this, "CloudFrontErrorAlarm", {
        metric: errorRate,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: "High error rate detected in CloudFront distribution",
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(
        new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic)
      );
    }

    // Add API Gateway metrics if API name is provided
    if (props.apiName) {
      const apiLatency = new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "Latency",
        dimensionsMap: {
          ApiName: props.apiName,
          Stage: props.environment,
        },
        statistic: "Average",
        period: cdk.Duration.minutes(5),
      });

      const api5xxErrors = new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "5XXError",
        dimensionsMap: {
          ApiName: props.apiName,
          Stage: props.environment,
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });

      widgets.push(
        new cloudwatch.GraphWidget({
          title: "API Gateway Latency",
          left: [apiLatency],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: "API Gateway 5XX Errors",
          left: [api5xxErrors],
          width: 12,
        })
      );

      // Create API Gateway alarm
      new cloudwatch.Alarm(this, "ApiGatewayErrorAlarm", {
        metric: api5xxErrors,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: "High error rate detected in API Gateway",
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(
        new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic)
      );
    }

    // Add Lambda metrics if function name is provided
    if (props.lambdaFunctionName) {
      const lambdaErrors = new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Errors",
        dimensionsMap: {
          FunctionName: props.lambdaFunctionName,
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });

      const lambdaDuration = new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Duration",
        dimensionsMap: {
          FunctionName: props.lambdaFunctionName,
        },
        statistic: "Average",
        period: cdk.Duration.minutes(5),
      });

      widgets.push(
        new cloudwatch.GraphWidget({
          title: "Lambda Function Errors",
          left: [lambdaErrors],
          width: 12,
        }),
        new cloudwatch.GraphWidget({
          title: "Lambda Function Duration",
          left: [lambdaDuration],
          width: 12,
        })
      );

      // Create Lambda alarm
      new cloudwatch.Alarm(this, "LambdaErrorAlarm", {
        metric: lambdaErrors,
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: "High error rate in Lambda function",
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(
        new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic)
      );
    }

    // Add S3 metrics if bucket is provided
    if (props.bucket) {
      const s3Errors = new cloudwatch.Metric({
        namespace: "AWS/S3",
        metricName: "4xxErrors",
        dimensionsMap: {
          BucketName: props.bucket.bucketName,
        },
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });

      widgets.push(
        new cloudwatch.GraphWidget({
          title: "S3 Errors",
          left: [s3Errors],
          width: 12,
        })
      );

      // Create S3 alarm
      new cloudwatch.Alarm(this, "S3ErrorAlarm", {
        metric: s3Errors,
        threshold: 10,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        alarmDescription: "High error rate in S3 bucket",
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(
        new cdk.aws_cloudwatch_actions.SnsAction(this.alertTopic)
      );
    }

    // Add all widgets to dashboard
    this.dashboard.addWidgets(...widgets);

    // Add tags
    cdk.Tags.of(this).add("Feature", "Monitoring");
  }
}

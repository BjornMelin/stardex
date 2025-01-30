import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { Environment } from "../types/environment";

export interface SecurityStackProps extends cdk.StackProps {
  environment: Environment;
  loadBalancer: elbv2.ApplicationLoadBalancer;
}

export class SecurityStack extends cdk.Stack {
  public readonly ecsTaskRole: iam.Role;
  public readonly ecsExecutionRole: iam.Role;
  public readonly kmsKey: kms.Key;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
    super(scope, id, props);

    // Create KMS Key for encryption
    this.kmsKey = new kms.Key(this, "ServiceKey", {
      enableKeyRotation: true,
      description: `KMS key for ${props.environment.name} environment`,
      alias: `${props.environment.name}-service-key`,
    });

    // Create ECS Task Role with minimal permissions
    this.ecsTaskRole = new iam.Role(this, "ECSTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Role for ECS tasks",
    });

    // Add minimal required permissions for the task
    this.ecsTaskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["kms:Decrypt", "kms:GenerateDataKey"],
        resources: [this.kmsKey.keyArn],
      })
    );

    // Create ECS Execution Role
    this.ecsExecutionRole = new iam.Role(this, "ECSExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      description: "Role for ECS task execution",
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    // Add permissions for pulling images and writing logs
    this.ecsExecutionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      })
    );

    // Create WAF Web ACL
    const webAcl = new wafv2.CfnWebACL(this, "WebACL", {
      defaultAction: { allow: {} },
      scope: "REGIONAL",
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.environment.name}-web-acl-metric`,
        sampledRequestsEnabled: true,
      },
      rules: [
        // Rate limiting rule
        {
          name: "RateLimit",
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: props.environment.rateLimit.requestsPerSecond,
              aggregateKeyType: "IP",
            },
          },
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment.name}-rate-limit-metric`,
            sampledRequestsEnabled: true,
          },
        },
        // AWS Managed Rules
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment.name}-common-ruleset-metric`,
            sampledRequestsEnabled: true,
          },
        },
        // SQL Injection Prevention
        {
          name: "AWSManagedRulesSQLiRuleSet",
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesSQLiRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment.name}-sqli-ruleset-metric`,
            sampledRequestsEnabled: true,
          },
        },
        // Bad Input Prevention
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: `${props.environment.name}-bad-inputs-metric`,
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Associate WAF Web ACL with the Application Load Balancer
    new wafv2.CfnWebACLAssociation(this, "WebACLAssociation", {
      resourceArn: props.loadBalancer.loadBalancerArn,
      webAclArn: webAcl.attrArn,
    });

    // Outputs
    new cdk.CfnOutput(this, "TaskRoleArn", {
      value: this.ecsTaskRole.roleArn,
      description: "ECS Task Role ARN",
    });

    new cdk.CfnOutput(this, "ExecutionRoleArn", {
      value: this.ecsExecutionRole.roleArn,
      description: "ECS Execution Role ARN",
    });

    new cdk.CfnOutput(this, "KMSKeyArn", {
      value: this.kmsKey.keyArn,
      description: "KMS Key ARN",
    });

    new cdk.CfnOutput(this, "WebACLArn", {
      value: webAcl.attrArn,
      description: "WAF Web ACL ARN",
    });
  }
}

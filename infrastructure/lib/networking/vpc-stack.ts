import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Environment } from "../types/environment";

export interface VpcStackProps extends cdk.StackProps {
  environment: Environment;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    // Create VPC with specified AZs and NAT gateways
    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: props.environment.vpc.maxAzs,
      natGateways: props.environment.vpc.natGateways,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // Enable VPC Flow Logs
    const flowLogsRole = new iam.Role(this, "FlowLogsRole", {
      assumedBy: new iam.ServicePrincipal("vpc-flow-logs.amazonaws.com"),
    });

    const flowLogsGroup = new logs.LogGroup(this, "FlowLogsGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    flowLogsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
        resources: [flowLogsGroup.logGroupArn],
      })
    );

    this.vpc.addFlowLog("FlowLogs", {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(
        flowLogsGroup,
        flowLogsRole
      ),
      trafficType: ec2.FlowLogTrafficType.ALL,
    });

    // Create Security Group for Application Load Balancer
    this.albSecurityGroup = new ec2.SecurityGroup(this, "ALBSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for Application Load Balancer",
      allowAllOutbound: false,
    });

    // Allow inbound HTTPS traffic
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic"
    );

    // Create Security Group for ECS Tasks
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, "ECSSecurityGroup", {
      vpc: this.vpc,
      description: "Security group for ECS Tasks",
      allowAllOutbound: false,
    });

    // Allow inbound traffic from ALB
    this.ecsSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(this.albSecurityGroup.securityGroupId),
      ec2.Port.tcp(8000),
      "Allow traffic from ALB"
    );

    // Allow outbound HTTPS for container image pulls and AWS service access
    this.ecsSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS outbound traffic"
    );

    // Add VPC Endpoints for AWS services
    this.addVpcEndpoints();

    // Output VPC information
    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      description: "VPC ID",
    });
  }

  private addVpcEndpoints(): void {
    // Add VPC Endpoints for AWS services to reduce NAT Gateway costs
    this.vpc.addInterfaceEndpoint("ECREndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      securityGroups: [this.ecsSecurityGroup],
    });

    this.vpc.addInterfaceEndpoint("ECRDockerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      securityGroups: [this.ecsSecurityGroup],
    });

    this.vpc.addInterfaceEndpoint("CloudWatchLogsEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      securityGroups: [this.ecsSecurityGroup],
    });

    this.vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      securityGroups: [this.ecsSecurityGroup],
    });

    // S3 Gateway Endpoint (free)
    this.vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });
  }
}

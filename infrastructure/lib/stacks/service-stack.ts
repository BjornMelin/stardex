import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Environment } from "../types/environment";

export interface ServiceStackProps extends cdk.StackProps {
  environment: Environment;
  vpc: ec2.Vpc;
  taskRole: iam.Role;
  executionRole: iam.Role;
  ecsSecurityGroup: ec2.SecurityGroup;
  albSecurityGroup: ec2.SecurityGroup;
}

export class ServiceStack extends cdk.Stack {
  public readonly service: ecs.FargateService;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      containerInsights: true,
    });

    // Create ECR Repository
    this.repository = new ecr.Repository(this, "Repository", {
      repositoryName: `${props.environment.name}-service`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          maxImageCount: 5,
          description: "Keep only recent images",
        },
      ],
      imageScanOnPush: true,
    });

    // Create Log Group
    const logGroup = new logs.LogGroup(this, "ServiceLogs", {
      retention: props.environment.monitoring.logRetentionDays,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        memoryLimitMiB: props.environment.container.memoryLimitMiB,
        cpu: props.environment.container.cpu,
        taskRole: props.taskRole,
        executionRole: props.executionRole,
      }
    );

    // Add Container to Task Definition
    const container = taskDefinition.addContainer("ServiceContainer", {
      image: ecs.ContainerImage.fromEcrRepository(this.repository),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "service",
        logGroup: logGroup,
      }),
      environment: {
        NODE_ENV: props.environment.name,
        CACHE_ENABLED: props.environment.cache.enabled.toString(),
        CACHE_TTL: props.environment.cache.ttlSeconds.toString(),
      },
      healthCheck: {
        command: [
          "CMD-SHELL",
          "curl -f http://localhost:8000/health || exit 1",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    container.addPortMappings({
      containerPort: 8000,
      protocol: ecs.Protocol.TCP,
    });

    // Create Application Load Balancer
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
    });

    // Create Target Group
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc: props.vpc,
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: 8000,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Create HTTPS Listener
    const httpsListener = this.loadBalancer.addListener("HTTPSListener", {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [
        {
          certificateArn: `arn:aws:acm:${this.region}:${this.account}:certificate/${props.environment.domain}`,
        },
      ],
      defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
    });

    // Create HTTP Listener that redirects to HTTPS
    this.loadBalancer.addListener("HTTPListener", {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: "HTTPS",
        port: "443",
        permanent: true,
      }),
    });

    // Create ECS Service
    this.service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: props.environment.container.desiredCount,
      securityGroups: [props.ecsSecurityGroup],
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      deploymentController: {
        type: ecs.DeploymentControllerType.ECS,
      },
      circuitBreaker: {
        rollback: true,
      },
    });

    // Add Auto Scaling
    const scaling = this.service.autoScaleTaskCount({
      minCapacity: props.environment.scaling.minCapacity,
      maxCapacity: props.environment.scaling.maxCapacity,
    });

    scaling.scaleOnCpuUtilization("CPUScaling", {
      targetUtilizationPercent: props.environment.scaling.targetCpuUtilization,
      scaleInCooldown: cdk.Duration.seconds(
        props.environment.scaling.scaleInCooldown
      ),
      scaleOutCooldown: cdk.Duration.seconds(
        props.environment.scaling.scaleOutCooldown
      ),
    });

    // Add service to target group
    this.service.attachToApplicationTargetGroup(this.targetGroup);

    // Create ElastiCache if caching is enabled
    if (props.environment.cache.enabled) {
      // Create security group for ElastiCache
      const cacheSecurityGroup = new ec2.SecurityGroup(
        this,
        "CacheSecurityGroup",
        {
          vpc: props.vpc,
          description: "Security group for ElastiCache",
          allowAllOutbound: false,
        }
      );

      // Allow inbound access from ECS tasks
      cacheSecurityGroup.addIngressRule(
        props.ecsSecurityGroup,
        ec2.Port.tcp(6379),
        "Allow Redis access from ECS tasks"
      );

      // Create subnet group
      const cacheSubnetGroup = new elasticache.CfnSubnetGroup(
        this,
        "CacheSubnetGroup",
        {
          description: "Subnet group for ElastiCache",
          subnetIds: props.vpc.privateSubnets.map((subnet) => subnet.subnetId),
        }
      );

      // Create Redis cluster
      const redis = new elasticache.CfnCacheCluster(this, "Redis", {
        cacheNodeType: "cache.t3.micro",
        engine: "redis",
        numCacheNodes: 1,
        vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId],
        cacheSubnetGroupName: cacheSubnetGroup.ref,
      });

      // Add Redis connection info to container environment
      container.addEnvironment("REDIS_HOST", redis.attrRedisEndpointAddress);
      container.addEnvironment("REDIS_PORT", redis.attrRedisEndpointPort);
    }

    // Outputs
    new cdk.CfnOutput(this, "ServiceName", {
      value: this.service.serviceName,
      description: "ECS Service Name",
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: this.loadBalancer.loadBalancerDnsName,
      description: "Load Balancer DNS Name",
    });

    new cdk.CfnOutput(this, "RepositoryURI", {
      value: this.repository.repositoryUri,
      description: "ECR Repository URI",
    });
  }
}

#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VpcStack } from "../lib/networking/vpc-stack";
import { SecurityStack } from "../lib/security/security-stack";
import { ServiceStack } from "../lib/stacks/service-stack";
import { MonitoringStack } from "../lib/monitoring/monitoring-stack";
import { PipelineStack } from "../lib/stacks/pipeline-stack";
import { getEnvironment } from "../lib/config/environment";

const app = new cdk.App();

// Get environment configuration
const stage = app.node.tryGetContext("stage") || "development";
const env = getEnvironment(stage);

// Get AWS account configuration
const awsEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

// Common tags for all stacks
const commonTags = {
  Environment: env.name,
  Project: "Stardex",
  ManagedBy: "CDK",
};

// Create VPC Stack
const vpcStack = new VpcStack(app, `${env.name}-vpc`, {
  environment: env,
  env: awsEnv,
  tags: commonTags,
});

// Create Security Stack
const securityStack = new SecurityStack(app, `${env.name}-security`, {
  environment: env,
  loadBalancer: undefined as any, // Will be updated after service stack creation
  env: awsEnv,
  tags: commonTags,
});

// Create Service Stack
const serviceStack = new ServiceStack(app, `${env.name}-service`, {
  environment: env,
  vpc: vpcStack.vpc,
  taskRole: securityStack.ecsTaskRole,
  executionRole: securityStack.ecsExecutionRole,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  albSecurityGroup: vpcStack.albSecurityGroup,
  env: awsEnv,
  tags: commonTags,
});

// Update Security Stack with Load Balancer
const updatedSecurityStack = new SecurityStack(
  app,
  `${env.name}-security-updated`,
  {
    environment: env,
    loadBalancer: serviceStack.loadBalancer,
    env: awsEnv,
    tags: commonTags,
  }
);

// Create Monitoring Stack
const monitoringStack = new MonitoringStack(app, `${env.name}-monitoring`, {
  environment: env,
  service: serviceStack.service,
  loadBalancer: serviceStack.loadBalancer,
  targetGroup: serviceStack.targetGroup,
  env: awsEnv,
  tags: commonTags,
});

// Create Pipeline Stack
const pipelineStack = new PipelineStack(app, `${env.name}-pipeline`, {
  environment: env,
  repository: serviceStack.repository,
  service: serviceStack.service,
  env: awsEnv,
  tags: commonTags,
});

// Add stack dependencies
securityStack.addDependency(vpcStack);
serviceStack.addDependency(securityStack);
updatedSecurityStack.addDependency(serviceStack);
monitoringStack.addDependency(serviceStack);
pipelineStack.addDependency(serviceStack);

// Output synthesized CloudFormation templates
app.synth();

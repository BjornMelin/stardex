#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DnsStack } from "../lib/stacks/dns-stack";
import { StorageStack } from "../lib/stacks/storage-stack";
import { DeploymentStack } from "../lib/stacks/deployment-stack";
import { MonitoringStack } from "../lib/stacks/monitoring-stack";
import { BackendStack } from "../lib/stacks/backend-stack";
import { BootstrapStack } from "../lib/stacks/bootstrap-stack";
import { CONFIG, getStackName } from "../lib/constants";

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-east-1",
};

// Bootstrap Stack (deploy this first)
const bootstrapStack = new BootstrapStack(
  app,
  getStackName("bootstrap", "prod"),
  {
    env,
    domainName: CONFIG.prod.domainName,
    rootDomainName: CONFIG.prod.rootDomainName,
    environment: CONFIG.prod.environment,
    tags: CONFIG.tags,
  }
);

// DNS Stack (must be in us-east-1 for CloudFront)
const dnsStack = new DnsStack(app, getStackName("dns", "prod"), {
  env: {
    ...env,
    region: "us-east-1", // Force us-east-1 for CloudFront certificate
  },
  domainName: CONFIG.prod.domainName,
  rootDomainName: CONFIG.prod.rootDomainName,
  environment: CONFIG.prod.environment,
  tags: CONFIG.tags,
});

// Storage Stack
const storageStack = new StorageStack(app, getStackName("storage", "prod"), {
  env,
  domainName: CONFIG.prod.domainName,
  rootDomainName: CONFIG.prod.rootDomainName,
  environment: CONFIG.prod.environment,
  certificate: dnsStack.certificate,
  hostedZone: dnsStack.hostedZone,
  tags: CONFIG.tags,
});

// Backend Stack
const backendStack = new BackendStack(app, getStackName("backend", "prod"), {
  env,
  domainName: CONFIG.prod.domainName,
  rootDomainName: CONFIG.prod.rootDomainName,
  environment: CONFIG.prod.environment,
  certificate: dnsStack.certificate,
  hostedZone: dnsStack.hostedZone,
  tags: CONFIG.tags,
});

// Deployment Stack
const deploymentStack = new DeploymentStack(
  app,
  getStackName("deployment", "prod"),
  {
    env,
    domainName: CONFIG.prod.domainName,
    rootDomainName: CONFIG.prod.rootDomainName,
    environment: CONFIG.prod.environment,
    bucket: storageStack.bucket,
    distribution: storageStack.distribution,
    tags: CONFIG.tags,
  }
);

// Monitoring Stack
const monitoringStack = new MonitoringStack(
  app,
  getStackName("monitoring", "prod"),
  {
    env,
    domainName: CONFIG.prod.domainName,
    rootDomainName: CONFIG.prod.rootDomainName,
    environment: CONFIG.prod.environment,
    bucket: storageStack.bucket,
    distribution: storageStack.distribution,
    lambda: backendStack.lambda,
    api: backendStack.api,
    tags: CONFIG.tags,
  }
);

// Stack dependencies
storageStack.addDependency(dnsStack);
backendStack.addDependency(dnsStack);
deploymentStack.addDependency(storageStack);
monitoringStack.addDependency(storageStack);
monitoringStack.addDependency(backendStack);

// Add tags to all stacks
const stacks = [
  bootstrapStack,
  dnsStack,
  storageStack,
  backendStack,
  deploymentStack,
  monitoringStack,
];

stacks.forEach((stack) => {
  cdk.Tags.of(stack).add("Project", "Stardex");
  cdk.Tags.of(stack).add("ManagedBy", "CDK");
  cdk.Tags.of(stack).add("Environment", CONFIG.prod.environment);
});

app.synth();

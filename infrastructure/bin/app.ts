#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DnsStack } from "../lib/stacks/dns-stack";
import { DeploymentStack } from "../lib/stacks/deployment-stack";
import { ParentStack } from "../lib/stacks/parent-stack";
import { BootstrapStack } from "../lib/stacks/bootstrap-stack";
import { CONFIG, getStackName } from "../lib/constants";

const app = new cdk.App();

// Environment configuration
// Base environment for most stacks
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || "us-west-1", // Default to us-west-1
};

// Special environment for resources that must be in us-east-1
const usEastEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

// Bootstrap Stack (deploy this first)
const bootstrapStack = new BootstrapStack(
  app,
  getStackName("bootstrap", "prod"),
  {
    env,
    crossRegionReferences: true, // Enable cross-region references
    domainName: CONFIG.prod.domainName,
    rootDomainName: CONFIG.prod.rootDomainName,
    environment: CONFIG.prod.environment,
    tags: CONFIG.tags,
  }
);

// DNS Stack (must be in us-east-1 for CloudFront)
const dnsStack = new DnsStack(app, getStackName("dns", "prod"), {
  env: usEastEnv, // Use us-east-1 for CloudFront certificate
  domainName: CONFIG.prod.domainName,
  rootDomainName: CONFIG.prod.rootDomainName,
  environment: CONFIG.prod.environment,
  tags: CONFIG.tags,
});

// Parent Stack (contains storage, backend, and monitoring as nested stacks)
const parentStack = new ParentStack(app, getStackName("stardex", "prod"), {
  env,
  crossRegionReferences: true,
  domainName: CONFIG.prod.domainName,
  rootDomainName: CONFIG.prod.rootDomainName,
  environment: CONFIG.prod.environment,
  certificate: dnsStack.certificate,
  hostedZone: dnsStack.hostedZone,
  tags: CONFIG.tags,
});

// Deployment Stack (references resources from parent stack)
const deploymentStack = new DeploymentStack(
  app,
  getStackName("deployment", "prod"),
  {
    env,
    crossRegionReferences: true,
    domainName: CONFIG.prod.domainName,
    rootDomainName: CONFIG.prod.rootDomainName,
    environment: CONFIG.prod.environment,
    bucket: parentStack.storageConstruct.bucket,
    distribution: parentStack.storageConstruct.distribution,
    tags: CONFIG.tags,
  }
);

// Stack dependencies
parentStack.addDependency(dnsStack);
deploymentStack.addDependency(parentStack);

// Add tags to all stacks
const stacks = [bootstrapStack, dnsStack, parentStack, deploymentStack];

stacks.forEach((stack) => {
  cdk.Tags.of(stack).add("Project", "Stardex");
  cdk.Tags.of(stack).add("ManagedBy", "CDK");
  cdk.Tags.of(stack).add("Environment", CONFIG.prod.environment);
});

app.synth();

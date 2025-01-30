# 🏗️ CDK Stacks

> Core infrastructure stacks for Stardex application

## 📑 Table of Contents

- [Overview](#-overview)
- [Stack Architecture](#-stack-architecture)
- [Stack Details](#-stack-details)
- [Deployment Flow](#-deployment-flow)

## 🎯 Overview

This directory contains the AWS CDK stack definitions that form the core infrastructure of Stardex. The stacks are designed to be modular, maintainable, and follow a clear dependency hierarchy.

## 🏛️ Stack Architecture

```mermaid
graph TD
    BS[Bootstrap Stack] -->|enables| DS[DNS Stack]
    DS -->|provides SSL| PS[Parent Stack]
    LS[Lambda Layer Stack] -->|provides layers| PS
    PS -->|contains| SS[Storage Stack]
    PS -->|contains| BS2[Backend Stack]
    PS -->|contains| MS[Monitoring Stack]
    PS -->|references| DEP[Deployment Stack]

    subgraph "Infrastructure Flow"
        direction TB
        BS -..-> DS -..-> LS -..-> PS -..-> DEP
    end
```

## 📚 Stack Details

### 🔐 Bootstrap Stack (`bootstrap-stack.ts`)

Sets up initial AWS infrastructure:

- GitHub Actions OIDC provider
- IAM roles and policies
- SSM parameters

```mermaid
graph LR
    A[OIDC Provider] --> B[IAM Role]
    B --> C[Policy]
    B --> D[SSM Parameter]
```

### 🌐 DNS Stack (`dns-stack.ts`)

Manages DNS and certificates:

- Route 53 hosted zones
- ACM certificates
- DNS validation

```mermaid
graph LR
    A[Route 53] --> B[Hosted Zone]
    B --> C[ACM Certificate]
    C --> D[DNS Validation]
```

### 🎯 Lambda Layer Stack (`lambda-layer-stack.ts`)

Manages Python dependencies:

- API dependencies layer
- ML dependencies layer
- Version control
- Layer permissions

```mermaid
graph TD
    A[Lambda Layer Stack] --> B[API Layer]
    A --> C[ML Layer]
    B --> D[Layer Version]
    C --> E[Layer Version]
```

### 👨‍👩‍👧‍👦 Parent Stack (`parent-stack.ts`)

Main orchestrator stack:

- Contains nested stacks
- Resource sharing
- Cross-stack references

```mermaid
graph TD
    A[Parent Stack] --> B[Storage Stack]
    A --> C[Backend Stack]
    A --> D[Monitoring Stack]
    B --> E[S3 + CloudFront]
    C --> F[Lambda + API Gateway]
    D --> G[CloudWatch Dashboard]
```

### 🚀 Deployment Stack (`deployment-stack.ts`)

Manages deployment resources:

- IAM permissions
- S3 access
- CloudFront invalidations

## 🔄 Deployment Flow

1. **Bootstrap Phase**

```bash
npm run bootstrap:aws    # AWS CDK bootstrap
npm run bootstrap:stack # OIDC setup
```

2. **Infrastructure Phase**

```bash
npm run deploy:dns     # DNS configuration
npm run layer:update   # Lambda layers
npm run deploy:stardex # Main application
```

3. **Application Phase**

```bash
npm run deploy:deployment # Deployment resources
```

## 🏷️ Stack Properties

All stacks extend base properties:

```typescript
interface BaseStackProps {
  domainName: string; // Application domain
  rootDomainName: string; // Root domain name
  environment: string; // Deployment environment
  tags?: Record<string, string>; // Resource tags
}
```

## 🔑 Best Practices

1. **Stack Organization**

   - Clear dependencies
   - Modular design
   - Cross-stack references

2. **Security**

   - OIDC authentication
   - Least privilege
   - Resource encryption

3. **Naming**

   - Consistent patterns
   - Environment prefixes
   - Clear resource names

4. **Resource Management**
   - Cost optimization
   - Cleanup policies
   - Version control

## 📈 Monitoring and Metrics

Each stack implements:

- CloudWatch metrics
- Custom dashboards
- Automated alarms
- Log retention

## 🔧 Customization

Configure stack behavior through:

1. Environment variables
2. CDK context
3. Stack props
4. AWS tags

## 🚨 Error Handling

- Graceful rollbacks
- Error notifications
- Resource cleanup
- State management

## 📝 Contributing

When adding new stacks:

1. Follow naming convention
2. Update dependency graph
3. Add proper documentation
4. Implement monitoring
5. Consider cost impact

# Stardex Deployment Guide

This guide details the process of deploying the Stardex application, including the FastAPI backend using ECS/Fargate and the Next.js frontend using S3, CloudFront, and custom domain configuration.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Infrastructure Setup](#backend-infrastructure-setup)
3. [Frontend Infrastructure Setup](#frontend-infrastructure-setup)
4. [Docker Configuration](#docker-configuration)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Security Best Practices](#security-best-practices)
7. [Domain Configuration](#domain-configuration)
8. [Monitoring and Management](#monitoring-and-management)

## Frontend Infrastructure Setup

### 1. Add Required CDK Dependencies

```sh
pip install aws-cdk.aws-s3 aws-cdk.aws-cloudfront aws-cdk.aws-cloudfront-origins aws-cdk.aws-route53 aws-cdk.aws-route53-targets aws-cdk.aws-certificatemanager
```

### 2. Create Frontend Stack

Create `infrastructure/lib/stacks/frontend_stack.py`:

```python
from aws_cdk import (
    core as cdk,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_route53 as route53,
    aws_route53_targets as targets,
    aws_certificatemanager as acm
)

class FrontendStack(cdk.Stack):
    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create S3 bucket for website hosting
        website_bucket = s3.Bucket(self, "StardexWebsiteBucket",
            bucket_name="stardex-website",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )

        # Get the hosted zone for bjornmelin.io
        hosted_zone = route53.HostedZone.from_lookup(self, "HostedZone",
            domain_name="bjornmelin.io"
        )

        # Create SSL certificate
        certificate = acm.Certificate(self, "StardexCertificate",
            domain_name="stardex.bjornmelin.io",
            validation=acm.CertificateValidation.from_dns(hosted_zone)
        )

        # Create CloudFront distribution
        distribution = cloudfront.Distribution(self, "StardexDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(website_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED
            ),
            domain_names=["stardex.bjornmelin.io"],
            certificate=certificate,
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html"
                )
            ]
        )

        # Create Route53 alias record
        route53.ARecord(self, "StardexAliasRecord",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(
                targets.CloudFrontTarget(distribution)
            ),
            record_name="stardex"
        )

        # Output the CloudFront URL and website URL
        cdk.CfnOutput(self, "DistributionDomainName",
            value=distribution.distribution_domain_name
        )
        cdk.CfnOutput(self, "WebsiteURL",
            value="https://stardex.bjornmelin.io"
        )
```

### 3. Build and Deploy Frontend

Create a build script for the Next.js frontend in `frontend/scripts/build-static.sh`:

```bash
#!/bin/bash
npm run build
npm run export
```

Add to `package.json`:
```json
{
  "scripts": {
    "export": "next export -o out"
  }
}
```

### 4. Update GitHub Actions Workflow

Add frontend deployment to `.github/workflows/deploy.yml`:

```yaml
      - name: Build Frontend
        run: |
          cd frontend
          npm ci
          npm run build
          npm run export

      - name: Deploy to S3
        run: |
          aws s3 sync frontend/out s3://stardex-website
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

## Domain Configuration

### 1. DNS Setup

1. Ensure your domain bjornmelin.io is using Route53 nameservers
2. Create hosted zone (if not exists):
```bash
aws route53 create-hosted-zone --name bjornmelin.io --caller-reference $(date +%s)
```

### 2. SSL Certificate

The CDK stack will automatically:
1. Create an SSL certificate in ACM
2. Validate it using DNS validation
3. Associate it with the CloudFront distribution

### 3. Route53 Records

The CDK stack will automatically:
1. Create an A record for stardex.bjornmelin.io
2. Point it to the CloudFront distribution


## Prerequisites

- AWS CLI installed and configured
- AWS CDK installed (`npm install -g aws-cdk`)
- Docker installed
- Python 3.x installed
- CDK project initialized

## Infrastructure Setup

### 1. Initialize CDK Project

```sh
cd infrastructure
cdk init app --language python
```

Install required AWS CDK packages:
```sh
pip install aws-cdk.aws-ecs aws-cdk.aws-ec2 aws-cdk.aws-ecr aws-cdk.aws-iam aws-cdk.aws-logs aws-cdk.aws-elasticloadbalancingv2
```

### 2. Infrastructure Stack Definition

Create `infrastructure/lib/stacks/backend_stack.py`:

```python
from aws_cdk import (
    core as cdk,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecr as ecr,
    aws_iam as iam,
    aws_elasticloadbalancingv2 as elbv2,
    aws_logs as logs
)

class BackendInfrastructureStack(cdk.Stack):
    def __init__(self, scope: cdk.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create a VPC (without NAT Gateways for cost savings)
        vpc = ec2.Vpc(self, "FastApiVpc",
                      max_azs=2,
                      nat_gateways=0,  # Remove NAT Gateways
                      subnet_configuration=[
                          ec2.SubnetConfiguration(
                              name="Public",
                              subnet_type=ec2.SubnetType.PUBLIC,
                              cidr_mask=24
                          )
                      ])

        # Create an ECS Cluster
        cluster = ecs.Cluster(self, "FastApiCluster", vpc=vpc)

        # Create an ECR Repository with lifecycle rules to reduce storage costs
        repository = ecr.Repository(self, "FastApiRepository",
            removal_policy=cdk.RemovalPolicy.DESTROY,
            lifecycle_rules=[
                ecr.LifecycleRule(
                    max_image_count=3  # Keep only recent images
                )
            ])

        # Define Task Role with minimal permissions
        task_role = iam.Role(self, "FastApiTaskRole",
                             assumed_by=iam.ServicePrincipal("ecs-tasks.amazonaws.com"))
        task_role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AmazonECSTaskExecutionRolePolicy")
        )

        # Define the ECS Task Definition with minimal resources
        task_definition = ecs.FargateTaskDefinition(self, "FastApiTaskDefinition",
                                                    memory_limit_mib=512,
                                                    cpu=256,  # Minimum CPU
                                                    task_role=task_role)

        container = task_definition.add_container("FastApiContainer",
                                                  image=ecs.ContainerImage.from_registry("public.ecr.aws/docker/library/python:3.10-slim"),
                                                  logging=ecs.LogDriver.aws_logs(stream_prefix="FastApiLogs"))
        container.add_port_mappings(ecs.PortMapping(container_port=8000))

        # Create ECS Service with public IP
        service = ecs.FargateService(self, "FastApiService",
                                     cluster=cluster,
                                     task_definition=task_definition,
                                     desired_count=1,
                                     assign_public_ip=True,  # Enable public IP
                                     vpc_subnets=ec2.SubnetSelection(
                                         subnet_type=ec2.SubnetType.PUBLIC
                                     ))
        
        # Allow inbound traffic to container port
        service.connections.security_groups[0].add_ingress_rule(
            ec2.Peer.any_ipv4(),
            ec2.Port.tcp(8000),
            'Allow inbound HTTP traffic'
        )

        # Output the Task Public IP (available after task starts)
        cdk.CfnOutput(self, "ServiceName", value=service.service_name)
```

### 3. Deploy Infrastructure

Deploy the stack using CDK:
```sh
cdk synth
cdk deploy
```

## Docker Configuration

### 1. Create Dockerfile

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2. Build and Push to ECR

```sh
# Get AWS account details
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=<your-region>

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push
cd backend
docker build -t fastapi-app .
docker tag fastapi-app $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/fastapi-app:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/fastapi-app:latest
```

## CI/CD Pipeline

### 1. GitHub Repository Setup

Configure the following secrets in your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ECR_REPOSITORY_NAME`

### 2. GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      AWS_REGION: ${{ secrets.AWS_REGION }}
      ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY_NAME }}
      CLUSTER_NAME: fastapi-cluster
      SERVICE_NAME: fastapi-service
      CONTAINER_NAME: fastapi-container

    steps:
      - name: Check out code
        uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service $SERVICE_NAME \
            --force-new-deployment
```

## Security Best Practices

1. **IAM Roles and Permissions**
   - Use principle of least privilege
   - Implement separate roles for different services
   - Regularly audit and rotate credentials

2. **Network Security**
   - Configure VPC security groups
   - Use private subnets for ECS tasks
   - Enable VPC flow logs

3. **Container Security**
   - Scan container images for vulnerabilities
   - Use immutable tags for container images
   - Implement resource limits

4. **Secrets Management**
   - Use AWS Secrets Manager for sensitive data
   - Rotate secrets regularly
   - Encrypt data in transit and at rest

## Monitoring and Management

### 1. CloudWatch Monitoring

Set up CloudWatch alarms for:
- CPU and memory utilization
- HTTP response codes
- Request latency
- Container health checks

### 2. Health Checks

Test the deployment:
```bash
# Get the API endpoint
export API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name backend-infrastructure \
  --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
  --output text)

# Test the endpoint
curl http://$API_ENDPOINT/health
```

### 3. Logs

View application logs:
```bash
aws logs tail /aws/ecs/FastApiLogs --follow
```

### 4. Scaling

Configure auto-scaling:
```python
scaling = service.auto_scale_task_count(
    max_capacity=10
)

scaling.scale_on_cpu_utilization("CpuScaling",
    target_utilization_percent=70,
    scale_in_cooldown=cdk.Duration.seconds(60),
    scale_out_cooldown=cdk.Duration.seconds(60)
)
```

## Cost Estimation (Highly Optimized)

### Monthly Infrastructure Costs (US East-1 Region)

#### 1. ECS Fargate (Optimized)
- Task Configuration: 0.25 vCPU, 512MB RAM (minimum size)
- Running on-demand only: Est. 360 hours/month (50% utilization)
- Calculation: $0.02177/hour * 360 hours = **$7.84**

#### 2. ECR Storage (Optimized)
- Minimal storage: 0.5GB = **$0.05**
- Limited image pushes: 10/month * 0.1GB = **$0.10**

#### 3. CloudWatch Logs (Minimal)
- Estimated 1GB logs/month
- Ingestion: $0.50/GB * 1GB = **$0.50**
- Storage: $0.03/GB * 1GB = **$0.03**

#### 4. Data Transfer (Minimal)
- Estimated outbound: 5GB/month
- First 5GB: $0.09/GB * 5GB = **$0.45**

### Total Estimated Monthly Cost (Highly Optimized)

| Service               | Cost    |
|----------------------|---------|
| ECS Fargate          | $7.84   |
| ECR                  | $0.15   |
| CloudWatch Logs      | $0.53   |
| Data Transfer        | $0.45   |
| **Total**            | **$8.97** |

### Major Cost-Saving Measures Implemented

1. **Eliminated NAT Gateway**
   - Removed NAT Gateway completely (saving $36.90/month)
   - Using public subnets for Fargate tasks

2. **Reduced Computing Costs**
   - Using minimum Fargate configuration
   - Potential to implement auto-scaling for off-hours
   - Consider AWS Savings Plans for additional savings

3. **Optimized Storage and Logging**
   - Minimal ECR image retention
   - Reduced log retention period
   - Implemented log filtering

### Further Cost Optimization Options

1. **Consider Spot Instances**
   - Could reduce Fargate costs by up to 70%
   - Requires handling interruptions

2. **Implement Auto-Scaling**
   ```python
   scaling.scale_on_schedule("ScaleDown",
       schedule=appscaling.Schedule.cron(
           hour="0", minute="0"
       ),
       min_capacity=0
   )
   ```

3. **Application-Level Optimizations**
   - Implement caching
   - Optimize API responses
   - Reduce log verbosity

### Cost Optimization Tips

1. **Reduce NAT Gateway Costs**
   - Consider using VPC Endpoints for AWS services
   - Place non-internet-requiring components in public subnets

2. **Optimize Fargate Resources**
   - Monitor actual CPU/Memory usage
   - Adjust task size based on usage patterns
   - Consider scaling down during off-hours

3. **Reduce Data Transfer**
   - Use CloudFront for caching
   - Implement appropriate caching headers
   - Compress API responses

4. **Log Management**
   - Set appropriate log retention periods
   - Filter unnecessary log entries
   - Consider using log aggregation services

## Troubleshooting

1. **Common Issues**
   - Check ECS service events
   - Verify task definition compatibility
   - Review container logs
   - Check security group configurations

2. **Rollback Procedure**
   - Use previous task definition
   - Review deployment history
   - Monitor application metrics during rollback

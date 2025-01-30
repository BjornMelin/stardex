# Stardex Infrastructure

This directory contains the infrastructure-as-code implementation for the Stardex application using AWS CDK. The infrastructure is designed to be secure, scalable, and cost-effective.

## Architecture Overview

The infrastructure consists of several key components:

### Networking

- VPC with public and private subnets
- Application Load Balancer for traffic distribution
- Security groups for access control
- VPC endpoints for AWS services

### Compute

- ECS Fargate for container orchestration
- Auto-scaling based on CPU utilization
- Health checks and circuit breakers
- Blue/green deployments

### Security

- WAF for DDoS protection and rate limiting
- SSL/TLS encryption for all traffic
- IAM roles with least privilege
- Security groups for network isolation
- KMS encryption for sensitive data

### Monitoring

- CloudWatch metrics and alarms
- Container insights
- Application logs
- Health check monitoring
- Custom dashboards

### Caching

- ElastiCache Redis cluster
- Configurable TTL
- Automatic failover

### CI/CD

- GitHub Actions workflow
- CodeBuild integration
- Automated testing
- Security scanning
- Production approval gates

## Directory Structure

```
infrastructure/
├── bin/
│   └── app.ts              # Main CDK app
├── lib/
│   ├── config/            # Environment configurations
│   ├── monitoring/        # Monitoring and alerting
│   ├── networking/        # VPC and network components
│   ├── security/         # Security and IAM
│   ├── stacks/           # Main infrastructure stacks
│   └── types/            # TypeScript type definitions
└── README.md
```

## Prerequisites

1. AWS CLI installed and configured
2. Node.js 14.x or later
3. AWS CDK CLI installed (`npm install -g aws-cdk`)
4. TypeScript installed (`npm install -g typescript`)

## Environment Configuration

The infrastructure supports multiple environments through the `environment.ts` configuration:

- Development
- Production

Each environment can have different settings for:

- Container resources
- Auto-scaling
- Monitoring thresholds
- Cache settings
- Rate limiting

## Deployment

1. Install dependencies:

```bash
npm install
```

2. Bootstrap CDK (first time only):

```bash
cdk bootstrap
```

3. Deploy to development:

```bash
cdk deploy --all --context stage=development
```

4. Deploy to production:

```bash
cdk deploy --all --context stage=production
```

## Security Features

### WAF Rules

- Rate limiting per IP
- SQL injection prevention
- Cross-site scripting (XSS) protection
- Known bad inputs blocking

### Network Security

- Private subnets for containers
- Security group restrictions
- VPC flow logs
- SSL/TLS encryption

### Access Control

- IAM roles with least privilege
- Service-linked roles
- Resource-based policies
- AWS Secrets Manager integration

## Monitoring and Alerting

### CloudWatch Alarms

- CPU utilization
- Memory utilization
- HTTP 5XX errors
- Response latency
- Health check failures

### Dashboards

- Service metrics
- Container insights
- Application performance
- Cost tracking

## Cost Optimization

### Implemented Strategies

1. Fargate Spot instances (optional)
2. Auto-scaling based on demand
3. Cache to reduce compute needs
4. VPC endpoints to reduce NAT costs
5. Log retention policies
6. ECR image lifecycle policies

### Estimated Costs

See DEPLOYMENT.md for detailed cost breakdown and optimization tips.

## Maintenance

### Updating Dependencies

```bash
npm update
```

### Running Security Scans

```bash
npm audit
cdk doctor
```

### Cleaning Up

```bash
cdk destroy --all
```

## Troubleshooting

### Common Issues

1. Deployment Failures

- Check CloudFormation events
- Verify IAM permissions
- Check resource quotas

2. Container Issues

- Check container logs
- Verify health check configuration
- Check security group rules

3. Networking Issues

- Verify VPC configuration
- Check route tables
- Validate security groups

### Logs

Access application logs:

```bash
aws logs tail /aws/ecs/ServiceLogs --follow
```

View deployment events:

```bash
aws ecs describe-services --cluster <cluster-name> --services <service-name>
```

## Best Practices

1. Infrastructure Updates

- Use CDK diff before deployment
- Test changes in development first
- Use proper git workflow
- Document changes

2. Security

- Regularly rotate credentials
- Review IAM permissions
- Update security patches
- Monitor security events

3. Monitoring

- Set up alerts for critical metrics
- Review logs regularly
- Monitor costs
- Track performance metrics

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests
4. Create pull request
5. Get approval
6. Merge to main

## License

See LICENSE file in the root directory.

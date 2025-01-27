# Stardex Infrastructure

CDK-based infrastructure for the Stardex application with automated setup and deployment.

## Quick Start

```bash
# Install dependencies
cd infrastructure
npm install

# Run bootstrap script (requires AWS and GitHub CLI)
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

The bootstrap script will:

1. Check prerequisites (AWS CLI, Node.js, GitHub CLI)
2. Install dependencies
3. Bootstrap CDK
4. Deploy the bootstrap stack (OIDC provider and IAM roles)
5. Configure GitHub environment and secrets
6. Create initial infrastructure commit

## Architecture

### Stacks

1. Bootstrap Stack (`prod-stardex-bootstrap`)

   - GitHub OIDC provider
   - IAM roles for deployment
   - Automated setup

2. DNS Stack (`prod-stardex-dns`)

   - SSL Certificate
   - Route53 configuration

3. Storage Stack (`prod-stardex-storage`)

   - S3 bucket for frontend
   - CloudFront distribution
   - Security configuration

4. Backend Stack (`prod-stardex-backend`)

   - FastAPI Lambda function
   - API Gateway
   - Custom domain

5. Deployment Stack (`prod-stardex-deployment`)

   - GitHub Actions permissions
   - Deployment configuration

6. Monitoring Stack (`prod-stardex-monitoring`)
   - CloudWatch dashboard
   - Custom metrics
   - Alarms

### Reusable Constructs

- `StaticWebsite`: S3 + CloudFront configuration
- `ApiEndpoint`: API Gateway setup
- `LambdaFunction`: Standardized Lambda
- `MonitoringDashboard`: Metrics and alarms

## Development

### Prerequisites

- Node.js 20.x
- AWS CLI configured with admin access
- GitHub CLI authenticated
- CDK CLI: `npm install -g aws-cdk`

### Local Development

```bash
# Install dependencies
npm install

# Watch for changes
npm run watch

# Run tests
npm test

# Compare changes
npm run diff
```

### Project Structure

```
infrastructure/
├── bin/
│   └── app.ts              # CDK app entry point
├── lib/
│   ├── constructs/         # Reusable constructs
│   │   ├── api-endpoint.ts
│   │   ├── lambda-function.ts
│   │   ├── monitoring-dashboard.ts
│   │   └── static-website.ts
│   ├── stacks/            # Stack implementations
│   │   ├── bootstrap-stack.ts
│   │   ├── backend-stack.ts
│   │   ├── deployment-stack.ts
│   │   ├── dns-stack.ts
│   │   ├── monitoring-stack.ts
│   │   └── storage-stack.ts
│   ├── types/            # TypeScript types
│   │   └── stack-props.ts
│   └── constants.ts      # Shared configuration
├── scripts/             # Helper scripts
│   ├── bootstrap.sh     # Initial setup
│   └── bundle-lambda.sh # Lambda packaging
└── cdk.json            # CDK configuration
```

## Deployment

### Initial Setup

```bash
# Run automated bootstrap
./scripts/bootstrap.sh

# Or manual steps:
npm install
npx cdk bootstrap
npx cdk deploy prod-stardex-bootstrap
```

### Regular Deployments

Deployments are automated via GitHub Actions:

1. Push changes to a feature branch
2. Create a pull request
3. GitHub Actions runs tests
4. On merge to main:
   - Infrastructure is deployed
   - Application is built and deployed
   - Health checks run
   - Results posted to PR

Manual deployment if needed:

```bash
npm run deploy:dns
npm run deploy:storage
npm run deploy:backend
npm run deploy:deployment
npm run deploy:monitoring
```

## Monitoring

- CloudWatch dashboard: [AWS Console Link]
- Custom metrics for all components
- Automated alerts
- Performance tracking

## Security

- OIDC authentication
- Least privilege permissions
- Resource encryption
- Security headers
- CORS configuration
- AWS best practices

## Maintenance

### Common Tasks

```bash
# Update dependencies
npm update

# Run security audit
npm audit

# Check for CDK updates
npm outdated

# Destroy resources
npm run destroy:all
```

### Troubleshooting

See `DEPLOYMENT.md` for:

- Detailed troubleshooting steps
- Common issues and solutions
- Rollback procedures
- Security considerations

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Create pull request
5. Wait for CI checks
6. Get approval
7. Merge to main

## Additional Documentation

- [Deployment Guide](./DEPLOYMENT.md)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

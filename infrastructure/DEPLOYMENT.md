# Stardex Deployment Guide

This guide explains how to set up and configure the CI/CD pipeline for Stardex using GitHub Actions.

## Prerequisites

1. AWS Account Setup

   - AWS Account with administrator access
   - Route53 hosted zone for bjornmelin.io domain

2. GitHub Repository Settings
   - Create a "production" environment in repository settings
   - Configure environment protection rules
   - Set up required secrets

## AWS Configuration Steps

1. Create OIDC Provider:

```bash
# Get your GitHub repository's OIDC provider URL
https://token.actions.githubusercontent.com
```

2. Create IAM OIDC Provider:

   - Go to AWS IAM Console
   - Navigate to "Identity Providers"
   - Add provider:
     - Provider URL: `https://token.actions.githubusercontent.com`
     - Audience: `sts.amazonaws.com`

3. Create GitHub Actions Role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS-ACCOUNT-ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:BjornMelin/stardex:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

4. Add Required IAM Permissions:
   - CloudFormation full access
   - S3 full access
   - CloudFront full access
   - Route53 full access
   - Lambda full access
   - API Gateway full access
   - Certificate Manager full access
   - CloudWatch full access
   - IAM role and policy management

## GitHub Repository Configuration

1. Configure Environment:

```bash
# Go to repository settings → Environments
# Create new environment: "production"
```

2. Add Required Secrets:

```bash
# Go to repository settings → Secrets and variables → Actions
AWS_ROLE_ARN="arn:aws:iam::<AWS-ACCOUNT-ID>:role/GithubActionsRole"
```

3. Configure Branch Protection:
   - Go to repository settings → Branches
   - Add rule for `main` branch
   - Require pull request reviews
   - Require status checks to pass
   - Include administrators in restrictions

## Pipeline Stages

1. Test Stage:

   - Frontend unit tests and linting
   - Backend Python tests
   - Infrastructure CDK tests

2. Deploy Infrastructure:

   - DNS stack with certificate validation
   - Storage stack for frontend hosting
   - Backend stack for API and Lambda
   - Deployment permissions
   - Monitoring and alerts

3. Deploy Application:

   - Build and deploy frontend
   - Deploy backend Lambda function
   - Configure API Gateway

4. Validation:
   - Health checks for frontend
   - API endpoint validation
   - Success/failure notifications

## Manual Deployment

If needed, you can manually deploy components:

```bash
# Deploy infrastructure
cd infrastructure
npm install
npm run deploy:dns
npm run deploy:storage
npm run deploy:backend
npm run deploy:deployment
npm run deploy:monitoring

# Deploy frontend
cd frontend
npm install
npm run build
aws s3 sync out/ s3://<BUCKET_NAME>/

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

## Monitoring and Logs

1. CloudWatch Dashboard:

   - Frontend metrics
   - Backend performance
   - API Gateway stats
   - Custom alarms

2. Access Logs:
   - CloudFront logs in S3
   - API Gateway logs
   - Lambda function logs

## Troubleshooting

1. Certificate Validation:

   - Can take up to 30 minutes
   - Verify DNS records in Route53

2. CloudFront Issues:

   - Distribution updates take 5-15 minutes
   - Check origin configuration
   - Verify SSL certificate status

3. GitHub Actions:

   - Check AWS role permissions
   - Verify environment secrets
   - Review workflow logs

4. API Gateway:
   - Check CORS configuration
   - Verify domain name setup
   - Review Lambda integration

## Rollback Procedures

1. Frontend Rollback:

```bash
# Revert to previous S3 version
aws s3 cp s3://<BUCKET_NAME>/<VERSION> s3://<BUCKET_NAME> --recursive

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

2. Infrastructure Rollback:

```bash
# Destroy specific stack
npm run cdk destroy prod-stardex-<stack-name>

# Destroy all stacks
npm run destroy:all
```

## Security Considerations

1. AWS Security:

   - OIDC authentication only
   - Least privilege permissions
   - Resource encryption
   - HTTPS only

2. Application Security:

   - CORS configuration
   - API authorization
   - Content security headers
   - Rate limiting

3. Monitoring:
   - Error rate alarms
   - Performance metrics
   - Security group changes
   - API usage alerts

## Maintenance

1. Regular Tasks:

   - Monitor SSL certificate expiration
   - Review CloudWatch alarms
   - Check S3 bucket usage
   - Analyze API Gateway metrics

2. Updates:
   - Keep dependencies current
   - Review security patches
   - Update Node.js/Python versions
   - Check for AWS service updates

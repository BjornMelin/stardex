#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting Stardex infrastructure bootstrap process...${NC}"

# Check prerequisites
command -v aws >/dev/null 2>&1 || {
    echo -e "${RED}Error: AWS CLI is required${NC}" >&2
    exit 1
}
command -v node >/dev/null 2>&1 || {
    echo -e "${RED}Error: Node.js is required${NC}" >&2
    exit 1
}
command -v npm >/dev/null 2>&1 || {
    echo -e "${RED}Error: npm is required${NC}" >&2
    exit 1
}
command -v gh >/dev/null 2>&1 || {
    echo -e "${RED}Error: GitHub CLI is required${NC}" >&2
    exit 1
}

# Check if logged into AWS
echo "Checking AWS credentials..."
aws sts get-caller-identity >/dev/null 2>&1 || {
    echo -e "${RED}Error: Not logged into AWS. Please run 'aws configure' first${NC}" >&2
    exit 1
}

# Check if logged into GitHub
echo "Checking GitHub authentication..."
gh auth status >/dev/null 2>&1 || {
    echo -e "${RED}Error: Not logged into GitHub. Please run 'gh auth login' first${NC}" >&2
    exit 1
}

# Install dependencies
echo "Installing dependencies..."
npm ci

# Bootstrap CDK in the account
echo "Bootstrapping CDK..."
npx cdk bootstrap

# Deploy bootstrap stack
echo "Deploying bootstrap stack..."
npx cdk deploy prod-stardex-bootstrap --require-approval never

# Get the role ARN from the stack output
ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name prod-stardex-bootstrap \
    --query 'Stacks[0].Outputs[?OutputKey==`GitHubActionsRoleArn`].OutputValue' \
    --output text)

if [ -z "$ROLE_ARN" ]; then
    echo -e "${RED}Error: Failed to get role ARN from stack outputs${NC}" >&2
    exit 1
fi

echo -e "${GREEN}Successfully created IAM role: $ROLE_ARN${NC}"

# Configure GitHub environment and secrets
REPO="BjornMelin/stardex"
ENV_NAME="production"

echo "Configuring GitHub environment and secrets..."

# Create production environment if it doesn't exist
gh api -X PUT "/repos/$REPO/environments/$ENV_NAME" \
    -f wait_timer=0 \
    -f reviewers='[]' \
    -f deployment_branch_policy='{"protected_branches":true,"custom_branch_policies":false}' || {
    echo -e "${RED}Error: Failed to create GitHub environment${NC}" >&2
    exit 1
}

# Add AWS role ARN secret to the environment
gh secret set AWS_ROLE_ARN --env $ENV_NAME --body "$ROLE_ARN" || {
    echo -e "${RED}Error: Failed to set GitHub secret${NC}" >&2
    exit 1
}

echo -e "${GREEN}Successfully configured GitHub environment and secrets${NC}"

# Create initial commit with infrastructure code
echo "Creating initial infrastructure commit..."
git add ../infrastructure
git commit -m "Initialize infrastructure with CDK" || true

echo -e "${GREEN}Bootstrap complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review and push the infrastructure code"
echo "2. Create a pull request to trigger the CI/CD pipeline"
echo "3. Monitor the deployment in GitHub Actions"
echo ""
echo -e "${YELLOW}Stack Details:${NC}"
echo "GitHub Environment: production"
echo "AWS Role ARN: $ROLE_ARN"
echo "CloudFormation Stack: prod-stardex-bootstrap"

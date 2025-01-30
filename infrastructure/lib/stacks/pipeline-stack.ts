import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { Environment } from "../types/environment";

export interface PipelineStackProps extends cdk.StackProps {
  environment: Environment;
  repository: ecr.Repository;
  service: ecs.FargateService;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // Create CodeBuild role
    const buildRole = new iam.Role(this, "CodeBuildRole", {
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      description: "Role for CodeBuild project",
    });

    // Add required permissions for building and pushing Docker images
    buildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: [props.repository.repositoryArn],
      })
    );

    // Add permissions for CloudWatch Logs
    buildRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // Create CodeBuild project for building and testing
    const buildProject = new codebuild.Project(this, "BuildProject", {
      projectName: `${props.environment.name}-service-build`,
      description: "Build and test service",
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          REPOSITORY_URI: {
            value: props.repository.repositoryUri,
          },
          ENVIRONMENT: {
            value: props.environment.name,
          },
        },
      },
      role: buildRole,
      timeout: cdk.Duration.minutes(30),
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          pre_build: {
            commands: [
              "echo Logging in to Amazon ECR...",
              "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $REPOSITORY_URI",
              "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
              "IMAGE_TAG=${COMMIT_HASH:=latest}",
            ],
          },
          build: {
            commands: [
              "echo Build started on `date`",
              "echo Building the Docker image...",
              "docker build -t $REPOSITORY_URI:$IMAGE_TAG .",
              "docker tag $REPOSITORY_URI:$IMAGE_TAG $REPOSITORY_URI:latest",
            ],
          },
          post_build: {
            commands: [
              "echo Build completed on `date`",
              "echo Pushing the Docker images...",
              "docker push $REPOSITORY_URI:$IMAGE_TAG",
              "docker push $REPOSITORY_URI:latest",
              "echo Writing image definitions file...",
              'printf \'{"ImageURI":"%s"}\' $REPOSITORY_URI:$IMAGE_TAG > imageDefinitions.json',
            ],
          },
        },
        artifacts: {
          files: ["imageDefinitions.json"],
        },
        cache: {
          paths: ["/root/.docker/**/*"],
        },
      }),
    });

    // Create GitHub Actions OIDC Provider if it doesn't exist
    const githubProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      }
    );

    // Create role for GitHub Actions
    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      assumedBy: new iam.WebIdentityPrincipal(
        githubProvider.openIdConnectProviderArn,
        {
          StringLike: {
            "token.actions.githubusercontent.com:sub": "repo:*",
          },
        }
      ),
      description: "Role for GitHub Actions",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add required permissions for GitHub Actions
    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: [props.repository.repositoryArn],
      })
    );

    // Add ECS deployment permissions
    githubActionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks",
        ],
        resources: ["*"],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, "BuildProjectName", {
      value: buildProject.projectName,
      description: "CodeBuild Project Name",
    });

    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      value: githubActionsRole.roleArn,
      description: "GitHub Actions Role ARN",
    });
  }
}

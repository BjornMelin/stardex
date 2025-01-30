import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export class LambdaLayerStack extends cdk.Stack {
  public readonly apiLayer: lambda.LayerVersion;
  public readonly mlLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the API Lambda Layer
    this.apiLayer = new lambda.LayerVersion(this, "APILayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../../layer-base"), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: ["bash", "-c", "cp -r /asset-input/python /asset-output/"],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: "FastAPI Dependencies Layer",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Define the ML Lambda Layer
    this.mlLayer = new lambda.LayerVersion(this, "MLLayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../../layer-ml"), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: ["bash", "-c", "cp -r /asset-input/python /asset-output/"],
        },
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: "Machine Learning Dependencies Layer",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Output the Layer ARNs for reference
    new cdk.CfnOutput(this, "APILayerARN", {
      value: this.apiLayer.layerVersionArn,
      description: "ARN of the API Lambda Layer",
    });

    new cdk.CfnOutput(this, "MLLayerARN", {
      value: this.mlLayer.layerVersionArn,
      description: "ARN of the ML Lambda Layer",
    });
  }
}

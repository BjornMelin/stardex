import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export class LambdaLayerStack extends cdk.Stack {
  public readonly fastApiLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda Layer
    this.fastApiLayer = new lambda.LayerVersion(this, "FastAPILayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../../layer")),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: "FastAPI + Dependencies Layer",
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Prevent deletion on stack destroy
    });

    // Output the Layer ARN for reference
    new cdk.CfnOutput(this, "LayerARN", {
      value: this.fastApiLayer.layerVersionArn,
      description: "ARN of the Lambda Layer",
    });
  }
}

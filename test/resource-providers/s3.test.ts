import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as blueprints from "../../lib";
import { GlobalResources } from "../../lib";
import * as s3 from "aws-cdk-lib/aws-s3";

describe("S3BucketProvider", () => {
  test("Stack is created with a new S3 Bucket", () => {
    // Given
    const app = new App();
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
      .resourceProvider(
        "my-s3-bucket",
        new blueprints.CreateS3BucketProvider("name-of-my-s3-bucket", "s3-bucket")
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::S3::Bucket", {
      Properties: {
        BucketName: 'name-of-my-s3-bucket',
      },
    });
  });

  test("Stack is created with an existing S3 Bucket", () => {
    // Given
    const app = new App();
    const s3Bucket = new blueprints.ImportS3BucketProvider("my-s3-imported-bucket-name", "imported-s3-bucket");
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
      .resourceProvider("my-s3-bucket", s3Bucket)
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    const bucket = <s3.IBucket>stack.node.tryFindChild('imported-s3-bucket');
    expect(bucket.bucketName == 'my-s3-imported-bucket-name')
  });
});

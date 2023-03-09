import { App } from "aws-cdk-lib";
import * as blueprints from "../../lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { CreateKmsKeyProvider } from "../../lib/resource-providers/kms-key";
import { GlobalResources } from "../../lib";

describe("KmsKeyProvider", () => {
  test("Stack created with defaults should have a KMS Key and secret encryption config", () => {
    // Given
    const app = new App();

    const stack = new blueprints.EksBlueprint(app, {
      id: "east-test-1",
    });

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::KMS::Key", {
      Properties: {
        KeyPolicy: Match.anyValue(),
        Description: Match.stringLikeRegexp("east-test-1"),
      },
      DeletionPolicy: "Retain",
    });
    template.hasResource("Custom::AWSCDK-EKS-Cluster", {
      Properties: {
        Config: {
          encryptionConfig: [
            {
              provider: {
                keyArn: Match.anyValue(),
              },
              resources: ["secrets"],
            },
          ],
        },
      },
    });
  });
  test("Stack created with lookup KMS Key resource provider should be added to secret encryption config", () => {
    // Given
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.KmsKey,
        new CreateKmsKeyProvider("my-custom-eks-key")
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("Custom::AWSCDK-EKS-Cluster", {
      Properties: {
        Config: {
          encryptionConfig: [
            {
              provider: {
                keyArn: Match.anyValue(),
              },
              resources: ["secrets"],
            },
          ],
        },
      },
    });
  });
  test("Stack created with KMS Key resource provider should be added to secret encryption config", () => {
    // Given
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        GlobalResources.KmsKey,
        new CreateKmsKeyProvider("my-custom-eks-key")
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::KMS::Key", {
      Properties: {
        KeyPolicy: Match.anyValue(),
        Description: Match.stringLikeRegexp("east-test-1"),
      },
      DeletionPolicy: "Retain",
    });
    template.hasResource("Custom::AWSCDK-EKS-Cluster", {
      Properties: {
        Config: {
          encryptionConfig: [
            {
              provider: {
                keyArn: Match.anyValue(),
              },
              resources: ["secrets"],
            },
          ],
        },
      },
    });
  });

  test("Blueprint with no KMS Key resource provider and default secret encryption set to false should result in a stack with no encryption", () => {
    // Given
    const app = new App();

    const stack = blueprints.EksBlueprint.builder()
      .account("123456789012")
      .region("us-east-1")
      .useDefaultSecretEncryption(false)
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then EKS cluster config has no encryption
    template.resourcePropertiesCountIs("Custom::AWSCDK-EKS-Cluster", {
        Config: {
            encryptionConfig: [
            {
                provider: {
                    keyArn: Match.anyValue(),
                },
                resources: ["secrets"],
            },
            ],
        },
    }, 
    0);
  });
});
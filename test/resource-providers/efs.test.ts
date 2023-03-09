import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as blueprints from "../../lib";
import { GlobalResources } from "../../lib";

describe("EfsFileSystemProvider", () => {
  test("Stack is created with EFS file system with no encryption", () => {
    // Given
    const app = new App();
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
      .resourceProvider(
        "my-efs-file-system-not-encrypted",
        new blueprints.CreateEfsFileSystemProvider({
          name: "my-efs-file-system-not-encrypted",
          efsProps: {
            encrypted: false,
          },
        })
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::EFS::FileSystem", {
      Properties: {
        Encrypted: false,
      },
    });
  });
  test("Stack is created with EFS file system encrypted by AWS managed KMS key", () => {
    // Given
    const app = new App();
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
      .resourceProvider(
        "my-efs-file-system-encrypted",
        new blueprints.CreateEfsFileSystemProvider({
          name: "my-efs-file-system-encrypted",
          efsProps: {
            encrypted: true,
          },
        })
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::EFS::FileSystem", {
      Properties: {
        Encrypted: true,
      },
    });
  });
  test("Stack is created with EFS file system encrypted by specific KMS key", () => {
    // Given
    const efsKmsKeyName = "efs-kms-encryption-key";
    const app = new App();
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
      .resourceProvider(
        efsKmsKeyName,
        new blueprints.CreateKmsKeyProvider(efsKmsKeyName)
      )
      .resourceProvider(
        "my-efs-file-system-encrypted-with-kms-key",
        new blueprints.CreateEfsFileSystemProvider({
          name: "my-efs-file-system-encrypted-with-kms-key",
          kmsKeyResourceName: efsKmsKeyName,
          efsProps: {
            encrypted: true,
          },
        })
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasResource("AWS::EFS::FileSystem", {
      Properties: {
        Encrypted: true,
      },
    });
    template.hasResourceProperties("AWS::EFS::FileSystem", {
      KmsKeyId: {},
    });
    template.hasResourceProperties("AWS::KMS::Alias", {
      AliasName: Match.stringLikeRegexp(efsKmsKeyName),
    });
  });
  test("Stack created with lookup EFS file system resource provider", () => {
    // Given
    const efsFileSystemName = "efs-file-system";
    const app = new App();
    const stack = blueprints.EksBlueprint.builder()
      .resourceProvider(
        efsFileSystemName,
        new blueprints.LookupEfsFileSystemProvider({
          name: efsFileSystemName,
          fileSystemId: "fs-12345678",
        })
      )
      .account("123456789012")
      .region("us-east-1")
      .build(app, "east-test-1");

    // When
    const template = Template.fromStack(stack);

    // Then
    template.hasOutput("EfsFileSystemId", { Value: "fs-12345678" });
  });
});

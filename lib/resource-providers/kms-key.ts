import * as kms from "aws-cdk-lib/aws-kms";
import { ResourceContext, ResourceProvider } from "../spi";

/**
 * Lookup or create a KMS Key to configure EKS secrets encryption.
 *
 * @example
 * ```typescript
 *     const stack = blueprints.EksBlueprint.builder()
 *       .resourceProvider(GlobalResources.KmsKey, new CreateKmsKeyProvider("my-custom-eks-key"))
 *       .account("123456789012")
 *       .region("us-east-1")
 *       .build(app, "east-test-1");
 * ```
 */
export class CreateKmsKeyProvider implements ResourceProvider<kms.IKey> {
  private readonly aliasName?: string;
  private readonly kmsKeyProps?: kms.KeyProps;

  /**
   * Configuration options for the KMS Key.
   *
   * @param aliasName The alias name for the KMS Key
   * @param kmsKeyProps The key props used
   */
  public constructor(aliasName?: string, kmsKeyProps?: kms.KeyProps) {
    this.aliasName = aliasName;
    this.kmsKeyProps = kmsKeyProps;
  }

  provide(context: ResourceContext): kms.IKey {
    const id = context.scope.node.id;
    const keyId = `${id}-${this.aliasName ?? "default"}-KmsKey`;
    let key = undefined;

    key = new kms.Key(context.scope, keyId, {
      alias: this.aliasName,
      description: `Key for EKS Cluster '${context.blueprintProps.id}'`,
      ...this.kmsKeyProps,
    });

    return key;
  }
}

/**
 * Pass an aliasName to lookup an existing KMS Key.
 *
 * @param aliasName The alias name to lookup an existing KMS Key
 */
export class LookupKmsKeyProvider implements ResourceProvider<kms.IKey> {
  private readonly aliasName: string;

  public constructor(aliasName: string) {
    this.aliasName = aliasName;
  }

  provide(context: ResourceContext): kms.IKey {
    const id = context.scope.node.id;
    const keyId = `${id}-${this.aliasName}-KmsKey`;

    return kms.Key.fromLookup(context.scope, keyId, {
      aliasName: this.aliasName,
    });
  }
}

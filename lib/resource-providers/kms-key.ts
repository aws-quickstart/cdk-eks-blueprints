import * as kms from "aws-cdk-lib/aws-kms";
import { ResourceContext, ResourceProvider } from "../spi";

/**
 * Lookup or create a KMS Key to configure EKS secrets encryption.
 *
 * @example
 * ```typescript
 *     const stack = blueprints.EksBlueprint.builder()
 *       .resourceProvider(GlobalResources.KmsKey, new KmsKeyProvider("my-custom-eks-key"))
 *       .account("123456789012")
 *       .region("us-east-1")
 *       .build(app, "east-test-1");
 * ```
 */
export class KmsKeyProvider implements ResourceProvider<kms.IKey> {
  private readonly aliasName?: string;
  private readonly kmsKeyProps?: kms.KeyProps;

  /**
   * Pass either en aliasName to lookup an existing or pass optional key props to create a new one.
   *
   * @param aliasName The alias name to lookup an existing KMS Key in the deployment target, if omitted a key will be created.
   * @param kmsKeyProps The key props used
   */
  public constructor(aliasName?: string, kmsKeyProps?: kms.KeyProps) {
    this.aliasName = aliasName;
    this.kmsKeyProps = kmsKeyProps;
  }

  provide(context: ResourceContext): kms.IKey {
    const id = context.scope.node.id;
    let key = undefined;

    if (this.aliasName) {
      key = kms.Key.fromLookup(context.scope, `${id}-kms-key`, {
        aliasName: this.aliasName,
      });
    }

    if (!key) {
      key = new kms.Key(context.scope, `${id}-kms-key`, {
        description: `Secrets Encryption Key for EKS Cluster '${context.blueprintProps.id}'`,
        ...this.kmsKeyProps,
      });
    }

    return key;
  }
}

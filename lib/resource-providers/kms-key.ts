import * as kms from "aws-cdk-lib/aws-kms";
import { ResourceContext, ResourceProvider } from "../spi";

export class KmsKeyProvider implements ResourceProvider<kms.IKey> {
  private readonly aliasName?: string;

  public constructor(aliasName?: string) {
    this.aliasName = aliasName;
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
        alias: this.aliasName,
      });
    }

    return key;
  }
}

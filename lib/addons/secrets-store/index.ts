import { Constants } from "..";
import { ClusterAddOn, ClusterInfo } from "../../../lib";
import { CsiDriverProviderAws } from "./csi-driver-provider-aws";
import { SecretsProvider } from "./secret-provider";

/**
 * Configuration options for Secrets Store AddOn
 */
export interface SecretsStoreAddOnProps {
  /**
   * Namespace where Secrets Store CSI driver will be installed
   * @default 'kube-system'
   */
  readonly namespace?: string;

  /**
   * Secrets Provider
   * @default CsiDriverProviderAws
   */
  secretsProvider?: SecretsProvider;
}

const SecretsStoreAddOnDefaults: SecretsStoreAddOnProps = {
  namespace: 'kube-system'
}

export class SecretsStoreAddOn implements ClusterAddOn {

  private options: SecretsStoreAddOnProps;
  public name: string;

  constructor(props?: SecretsStoreAddOnProps) {
    this.options = { ...SecretsStoreAddOnDefaults, ...props };
    if (this.options.secretsProvider === undefined) {
      this.options.secretsProvider = new CsiDriverProviderAws({
        namespace: this.options.namespace,
        syncSecrets: true
      });
    }
  }

  deploy(clusterInfo: ClusterInfo): void {
    const secretsManifest = this.options.secretsProvider!.provide(clusterInfo);
    clusterInfo.addProvisionedAddOn(Constants.SECRETS_STORE_CSI_DRIVER, secretsManifest)
  }
}
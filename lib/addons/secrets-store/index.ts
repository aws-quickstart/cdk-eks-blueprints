import { Construct } from '@aws-cdk/core';
import { ClusterAddOn, ClusterInfo } from '../../spi';
import { CsiDriverProviderAws } from './csi-driver-provider-aws';

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
   * Version of the Secrets Store CSI Driver. Eg. v0.0.23
   * @default 'v0.0.23/'
   */
  readonly version?: string;
  
  /**
   * Rotation Poll Interval, e.g. '120s'.
   * @default undefined
   * If provided, sets auto rotation to true and sets the polling interval.
   */
  readonly rotationPollInterval?: string;

  /**
   * Enable Sync Secrets to kubernetes secrets
   */
  readonly syncSecrets?: boolean;
}

const SecretsStoreAddOnDefaults: SecretsStoreAddOnProps = {
  namespace: 'kube-system',
  version: 'v0.0.23',
  rotationPollInterval: undefined,
  syncSecrets: true,
}

export class SecretsStoreAddOn implements ClusterAddOn {

  private options: SecretsStoreAddOnProps;

  constructor(props?: SecretsStoreAddOnProps) {
    this.options = { ...SecretsStoreAddOnDefaults, ...props };
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const csiDriverProviderAws = new CsiDriverProviderAws(
      this.options.namespace!,
      this.options.version!,
      this.options.rotationPollInterval,
      this.options.syncSecrets!
    );

    return Promise.resolve(csiDriverProviderAws.deploy(clusterInfo));
  } 
}

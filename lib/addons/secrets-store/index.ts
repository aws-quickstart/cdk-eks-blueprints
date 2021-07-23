import { KubernetesManifest } from "@aws-cdk/aws-eks";
import * as cdk from "@aws-cdk/core";
import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";
import { loadExternalYaml } from "../../utils/yaml-utils";

/**
 * Configuration options for Secrets Store AddOn
 */
export interface SecretsStoreAddOnProps extends cdk.ResourceProps {
  /**
   * Namespace where Secrets Store CSI driver will be installed
   * @default 'kube-system'
   */
  readonly namespace?: string;

  /**
   * Version of the Secrets Store CSI Driver. Eg. v0.0.23
   */
  readonly version?: string;

  /**
   * Rotation Poll Interval, e.g. '120s'.
   * If provided, sets auto rotation to true and sets the polling interval.
   */
  readonly rotationPollInterval?: string;
}

export interface Secret {
  /**
   * Specify the name of the secret or parameter.
   *
   */
  readonly secretName: string;

  /**
   * SecretType. Can be 'SSMPARAMETER' or 'SECRETSMANAGER'
   */
  readonly secretType: SecretType;

  /**
   * AWS region to use when retrieving secrets from Secrets Manager
   * or Parameter Store
   */
  readonly secretRegion?: 'string';

  /**
   * AWS Account Id where the secret lives.
   */
  readonly secretAccountId?: 'string';
}

export enum SecretType {
  SSMPARAMETER = 'ssmparameter',
  SECRETSMANAGER = 'secretsmanager'
}

const SecretsStoreAddOnDefaults: SecretsStoreAddOnProps = {
  namespace: 'kube-system',
  version: 'v0.0.23',
  rotationPollInterval: undefined
}

const SECRETS_STORE_CSI_DRIVER = 'secrets-store-csi-driver';

export class SecretsStoreAddOn implements ClusterAddOn {

  private options: SecretsStoreAddOnProps;
  public secretsProvider: KubernetesManifest;

  constructor(props?: SecretsStoreAddOnProps) {
    this.options = { ...SecretsStoreAddOnDefaults, ...props };
  }

  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;

    const values = new Map([
      ['linux.image.tag', this.options.version]
    ]);

    // TODO: Fix me, something is not working
    if (this.options.rotationPollInterval) {
      values.set('enableSecretRotation', 'true');
      values.set('rotationPollInterval', this.options.rotationPollInterval);
    }

    cluster.addHelmChart('SecretsStoreCSIDriver', {
      chart: SECRETS_STORE_CSI_DRIVER,
      repository: 'https://raw.githubusercontent.com/kubernetes-sigs/secrets-store-csi-driver/master/charts',
      namespace: this.options.namespace,
      version: this.options.version,
      release: SECRETS_STORE_CSI_DRIVER,
      wait: true,
      timeout: cdk.Duration.minutes(15),
      values,
    });

    const manifestUrl = `https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml`;
    const manifest = loadExternalYaml(manifestUrl);
    this.secretsProvider = clusterInfo.cluster.addManifest('SecretsStoreCsiDriverProviderAws', ...manifest);
  }
}
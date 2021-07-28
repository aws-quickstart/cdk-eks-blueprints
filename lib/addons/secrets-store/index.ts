import * as cdk from "@aws-cdk/core";
import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";
import { Constants } from "..";
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
  readonly secretRegion?: string;

  /**
   * AWS Account Id where the secret lives.
   */
  readonly secretAccountId?: string;
}

// create an interface for SecretProvider
// can provide their secret generation

export enum SecretType {
  SSMPARAMETER = 'ssmparameter',
  SECRETSMANAGER = 'secretsmanager'
}

const SecretsStoreAddOnDefaults: SecretsStoreAddOnProps = {
  namespace: 'kube-system',
  version: 'v0.0.23',
  rotationPollInterval: undefined
}
export class SecretsStoreAddOn implements ClusterAddOn {

  private options: SecretsStoreAddOnProps;
  public name: string;

  constructor(props?: SecretsStoreAddOnProps) {
    this.options = { ...SecretsStoreAddOnDefaults, ...props };
    this.name = Constants.SECRETS_STORE_CSI_DRIVER;
  }

  deploy(clusterInfo: ClusterInfo): cdk.Construct {
    const cluster = clusterInfo.cluster;

    const values = new Map([
      ['linux.image.tag', this.options.version]
    ]);

    // TODO: Fix me, something is not working
    if (this.options.rotationPollInterval) {
      values.set('enableSecretRotation', 'true');
      values.set('rotationPollInterval', this.options.rotationPollInterval);
    }

    const secretStoreCSIDriverHelmChart = cluster.addHelmChart('SecretsStoreCSIDriver', {
      chart: Constants.SECRETS_STORE_CSI_DRIVER,
      repository: 'https://raw.githubusercontent.com/kubernetes-sigs/secrets-store-csi-driver/master/charts',
      namespace: this.options.namespace,
      version: this.options.version,
      release: Constants.SECRETS_STORE_CSI_DRIVER,
      wait: true,
      timeout: cdk.Duration.minutes(15),
      values,
    });

    const manifestUrl = `https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml`;
    const manifest: Record<string, any>[] = loadExternalYaml(manifestUrl);
    const secretProviderManifest = clusterInfo.cluster.addManifest('SecretsStoreCsiDriverProviderAws', ...manifest);
    secretProviderManifest.node.addDependency(secretStoreCSIDriverHelmChart);
    return secretProviderManifest;
  }
}
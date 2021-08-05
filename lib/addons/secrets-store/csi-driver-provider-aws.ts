import * as cdk from "@aws-cdk/core";
import { ClusterInfo } from "../../../lib";
import { Constants } from "..";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { SecretsProvider } from "./secret-provider";
import { KubernetesManifest } from "@aws-cdk/aws-eks";

/**
 * Props for CsiDriverProviderAws
 */
export interface CsiDriverProviderAwsProps {
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
   * Sync Secret
   * @default false
   */
  readonly syncSecrets?: boolean;
}


const CsiDriverProviderAwsDefaults: CsiDriverProviderAwsProps = {
  namespace: 'kube-system',
  version: 'v0.0.23',
  rotationPollInterval: undefined,
  syncSecrets: true
}

export class CsiDriverProviderAws implements SecretsProvider {

  private options: CsiDriverProviderAwsProps;
  public name: string;

  constructor(props?: CsiDriverProviderAwsProps) {
    this.options = { ...CsiDriverProviderAwsDefaults, ...props };
    this.name = Constants.SECRETS_STORE_CSI_DRIVER;
  }

  provide(clusterInfo: ClusterInfo): KubernetesManifest {
    const cluster = clusterInfo.cluster;

    type chartValues = {
      linux: {
        image: {
          tag: string
        }
      },
      enableSecretRotation?: string,
      rotationPollInterval?: string,
      syncSecret?: {
        enabled: string
      }
    }

    let values: chartValues = {
      linux: {
        image: {
          tag: this.options.version!
        }
      }
    };

    if (typeof(this.options.rotationPollInterval) === 'string') {
      values.enableSecretRotation = 'true';
      values.rotationPollInterval = this.options.rotationPollInterval;
    }

    if (this.options.syncSecrets === true) {
      values.syncSecret = {
        enabled: 'true'
      }
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
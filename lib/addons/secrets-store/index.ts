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

export interface Secrets {
  /**
   * AWS Secrets to fetch
   */
  awsSecrets: AwsSecret[];

  /**
   * Kubernetes Secrets to sync
   */
  kubernetesSecrets?: KubernetesSecret[];
}

export interface AwsSecret {
  /**
   * Specify the name of the secret or parameter.
   *
   */
  readonly objectName: string;

  /**
   * SecretType. Can be 'SSMPARAMETER' or 'SECRETSMANAGER'
   */
  readonly objectType: AwsSecretType;

  /**
   * AWS region to use when retrieving secrets from Secrets Manager
   * or Parameter Store
   */
  readonly region?: string;

  /**
   * AWS Account Id where the secret lives.
   */
  readonly accountId?: string;
}

export interface KubernetesSecret {

  /**
   * Kubernetes Secret Name
   */
  secretName?: string;

  /**
   * Type of Kubernetes Secret
   * @default KubernetesSecretType.OPAQUE
   */
  type?: KubernetesSecretType

  /**
   * Secret Labels
   */
  labels?: Map<string, string>;

  /**
   * Secret Data
   */
  data: KubernetesSecretData[];
}

export interface KubernetesSecretData {

  /**
   * Name of the AWS Secret that is syncd
   */
  objectName: string;

  /**
   * Kubernetes Secret Key
   */
  key: string;
}

// create an interface for SecretProvider
// can provide their secret generation

export enum AwsSecretType {
  SSMPARAMETER = 'ssmparameter',
  SECRETSMANAGER = 'secretsmanager'
}

export enum KubernetesSecretType {
  OPAQUE = 'Opaque',
  BASIC_AUTH = 'kubernetes.io/basic-auth',
  TOKEN = 'bootstrap.kubernetes.io/token',
  DOCKER_CONFIG_JSON = 'kubernetes.io/dockerconfigjson',
  DOCKER_CONFIG = 'kubernetes.io/dockercfg',
  SSH_AUTH = 'kubernetes.io/ssh-auth',
  SERVICE_ACCOUNT_TOKEN = 'kubernetes.io/service-account-token',
  TLS = 'kubernetes.io/tls'
}

const SecretsStoreAddOnDefaults: SecretsStoreAddOnProps = {
  namespace: 'kube-system',
  version: 'v0.0.23',
  rotationPollInterval: undefined,
  syncSecrets: false
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
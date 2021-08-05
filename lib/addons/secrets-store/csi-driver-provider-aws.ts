import * as cdk from "@aws-cdk/core";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { ClusterInfo } from "../../stacks/cluster-types";
import { Constants } from "..";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { SecretsInfo, SecretsProvider } from "./secret-provider";
import { KubernetesManifest, ServiceAccount } from "@aws-cdk/aws-eks";
import { ApplicationTeam, TeamProps } from "../../teams";
import { CfnOutput } from "@aws-cdk/core";

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

export interface CsiDriverProviderAwsSecretsProps {
  /**
   * AWS Secrets to fetch
   */
  awsSecrets: AwsSecret[];

  /**
   * Kubernetes Secrets to sync
   */
  kubernetesSecrets?: KubernetesSecret[];
}

/**
 * Configuration for AWS Secrets
 */
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

/**
 * Configuration for Kubernetes Secrets
 */
export interface KubernetesSecret {

  /**
   * Kubernetes Secret Name
   */
  secretName?: string;

  /**
   * Type of Kubernetes Secret
   */
  type: KubernetesSecretType

  /**
   * Secret Labels
   */
  labels?: Map<string, string>;

  /**
   * Secret Data
   */
  data: KubernetesSecretData[];
}

/**
 * Data for Kubernetes Secrets
 */
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

export class CsiDriverProviderAwsSecrets implements SecretsInfo {

  readonly secrets: CsiDriverProviderAwsSecretsProps

  constructor(secrets: CsiDriverProviderAwsSecretsProps) {
    this.secrets = secrets;
  }

  /**
   * Setup the secrets for CSI driver
   * @param clusterInfo
   */
  setupSecrets(clusterInfo: ClusterInfo, team: ApplicationTeam): void {
    const csiDriver = clusterInfo.getProvisionedAddOn(Constants.SECRETS_STORE_CSI_DRIVER);
    console.assert(csiDriver != null, 'Secrets Driver ${Constants.SECRETS_STORE_CSI_DRIVER} is not provided in addons');

    // Create the service account for the team
    const serviceAccount = this.createServiceAccount(clusterInfo, team);

    // Create and apply SecretProviderClass manifest
    this.createSecretProviderClass(clusterInfo, serviceAccount, team.teamProps);
  }

  /**
   * Creates Service Account for CSI Secrets driver and sets up the IAM Policies
   * needed to access the AWS Secrets
   * @param cluster
   * @param team
   */
  private createServiceAccount(clusterInfo: ClusterInfo, team: ApplicationTeam): ServiceAccount {
    const cluster = clusterInfo.cluster;
    const serviceAccount = cluster.addServiceAccount(team.teamProps.name + '-sa', {
      name: team.teamProps.name + '-secrets-sa',
      namespace: team.teamProps.namespace
    });
    serviceAccount.node.addDependency(team.namespaceManifest);

    this.secrets.awsSecrets.forEach( (awsSecret)  => {
      const objectName = awsSecret.objectName;
      const region = awsSecret.region ? awsSecret.region : cdk.Aws.REGION;
      const accountId = awsSecret.accountId ? awsSecret.accountId : cdk.Aws.ACCOUNT_ID;
      const partition = cdk.Aws.PARTITION
      let policyStatement: PolicyStatement;

      if (awsSecret.objectType === AwsSecretType.SECRETSMANAGER) {
        policyStatement = new PolicyStatement({
            actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret'
            ],
            resources: [`arn:${partition}:secretsmanager:${region}:${accountId}:secret:${objectName}-??????`]
        });
      }
      else {
        policyStatement = new PolicyStatement({
            actions: [
                'ssm:GetParameters'
            ],
            resources: [`arn:${partition}:ssm:${region}:${accountId}:parameter/${objectName}`]
        });
      }
      serviceAccount.addToPrincipalPolicy(policyStatement);
    });

    new CfnOutput(clusterInfo.cluster.stack, `team-${team.teamProps.name}-service-account`, {
      value: serviceAccount.serviceAccountName
    });

    return serviceAccount;
  }

  /**
   * Create and apply the SecretProviderClass manifest
   * @param cluster
   * @param serviceAccount
   * @param teamProps
   */
  private createSecretProviderClass(clusterInfo: ClusterInfo, serviceAccount: ServiceAccount, teamProps: TeamProps) {
    const cluster = clusterInfo.cluster;
    const secretProviderClass = teamProps.name + '-aws-secrets';

    const secretProviderClassManifest = cluster.addManifest(secretProviderClass, {
      apiVersion: 'secrets-store.csi.x-k8s.io/v1alpha1',
      kind: 'SecretProviderClass',
      metadata: {
        name: secretProviderClass,
        namespace: teamProps.namespace
      },
      spec: {
        provider: 'aws',
        parameters: {
          objects: JSON.stringify(this.secrets.awsSecrets),
        },
        secretObjects: this.secrets.kubernetesSecrets ? this.secrets.kubernetesSecrets : undefined
      }
    });

    secretProviderClassManifest.node.addDependency(
      serviceAccount,
      clusterInfo.getProvisionedAddOn(Constants.SECRETS_STORE_CSI_DRIVER)!
    );
  }
}
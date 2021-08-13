import { ClusterInfo } from '../../../lib';
import { ApplicationTeam } from '../../teams';
import { CfnOutput, Construct } from '@aws-cdk/core';
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { IStringParameter } from '@aws-cdk/aws-ssm';
import { SecretProvider } from './secret-provider';

/**
 * TeamSecret Props
 */
export interface TeamSecretsProps {
  secretProvider: SecretProvider;
  kubernetesSecret?: KubernetesSecret;
}

/**
 * Configuration for Kubernetes Secrets
 */
export interface KubernetesSecret {

  /**
   * Kubernetes Secret Name
   */
  secretName: string;

  /**
   * Type of Kubernetes Secret
   */
  type?: KubernetesSecretType

  /**
   * Secret Labels
   */
  labels?: Map<string, string>;

  /**
   * Kubernetes SecretObject Data
   */
  data?: KubernetesSecretObjectData[];
}

/**
 * Data for Kubernetes Secrets
 */
interface KubernetesSecretObjectData {

  /**
   * Name of the AWS Secret that is syncd
   */
  objectName?: string;

  /**
   * Kubernetes Secret Key
   */
  key?: string;
}

enum AwsSecretType {
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

interface ParameterObject {
    objectName: string;
    objectType: string;
}

export class TeamSecrets {

  private parameterObjects: ParameterObject[];
  private kubernetesSecrets: KubernetesSecret[];

  constructor(private teamSecrets: TeamSecretsProps[]) {
    this.parameterObjects = [];
    this.kubernetesSecrets = [];
  }

  /**
   * Setup the secrets for CSI driver
   * @param clusterInfo
   */
  setupSecrets(clusterInfo: ClusterInfo, team: ApplicationTeam, csiDriver: Construct): void {
    // Create the service account for the team
    this.addPolicyToServiceAccount(clusterInfo, team);

    // Create and apply SecretProviderClass manifest
    this.createSecretProviderClass(clusterInfo, team, csiDriver);
  }

  /**
   * Creates Service Account for CSI Secrets driver and sets up the IAM Policies
   * needed to access the AWS Secrets
   * @param team
   */
  private addPolicyToServiceAccount(clusterInfo: ClusterInfo, team: ApplicationTeam) {
    const serviceAccount = team.serviceAccount;

    this.teamSecrets.forEach( (teamSecret) => {
      const data: KubernetesSecretObjectData[] = [];
      let kubernetesSecret: KubernetesSecret;
      let secretName: string;
      const secret: ISecret | IStringParameter = teamSecret.secretProvider.provide(clusterInfo); 

      if (Object.hasOwnProperty.call(secret, 'secretArn')) {
        const secretManagerSecret = secret as ISecret;
        secretName = secretManagerSecret.secretName;
        this.parameterObjects.push({
          objectName: secretManagerSecret.secretName,
          objectType: AwsSecretType.SECRETSMANAGER
        });
        secretManagerSecret.grantRead(serviceAccount);
      }
      else {
        const ssmSecret = secret as IStringParameter;
        secretName = ssmSecret.parameterName;
        this.parameterObjects.push({
          objectName: ssmSecret.parameterName,
          objectType: AwsSecretType.SSMPARAMETER
        });
        ssmSecret.grantRead(serviceAccount);
      }

      if (teamSecret.kubernetesSecret) {
        if (teamSecret.kubernetesSecret.data) {
          teamSecret.kubernetesSecret.data.forEach ( (item) => {
            const dataObject: KubernetesSecretObjectData = {
              objectName: item.objectName ?? secretName,
              key: item.key ?? secretName
            }
            data.push(dataObject);
          });
        }
        else {
          const dataObject: KubernetesSecretObjectData = {
            objectName: secretName,
            key: secretName
          }
          data.push(dataObject);
        }
        kubernetesSecret = {
          secretName: teamSecret.kubernetesSecret.secretName,
          type: teamSecret.kubernetesSecret.type ?? KubernetesSecretType.OPAQUE,
          labels: teamSecret.kubernetesSecret.labels ?? undefined,
          data,
        }
        this.kubernetesSecrets.push(kubernetesSecret);
      }
    });
  }

  /**
   * Create and apply the SecretProviderClass manifest
   * @param clusterInfo
   * @param team
   * @param csiDriver
   */
  private createSecretProviderClass(clusterInfo: ClusterInfo, team: ApplicationTeam, csiDriver: Construct) {
    const cluster = clusterInfo.cluster;
    const secretProviderClass = team.teamProps.name + '-aws-secrets';
    const secretProviderClassManifest = cluster.addManifest(secretProviderClass, {
      apiVersion: 'secrets-store.csi.x-k8s.io/v1alpha1',
      kind: 'SecretProviderClass',
      metadata: {
        name: secretProviderClass,
        namespace: team.teamProps.namespace
      },
      spec: {
        provider: 'aws',
        parameters: {
          objects: JSON.stringify(this.parameterObjects),
        },
        secretObjects: this.kubernetesSecrets
      }
    });

    secretProviderClassManifest.node.addDependency(
      team.serviceAccount,
      csiDriver
    );

    new CfnOutput(clusterInfo.cluster.stack, `team-${team.teamProps.name}-secret-provider-class `, {
      value: secretProviderClass
    });
  }
}
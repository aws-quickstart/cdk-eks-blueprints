import { ClusterInfo } from '../../../lib';
import { ApplicationTeam } from '../../teams';
import { CfnOutput, Construct } from '@aws-cdk/core';
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { IStringParameter } from '@aws-cdk/aws-ssm';

/**
 * TeamSecrets Props
 */
export interface TeamSecretsProps {
  secretsManagerSecrets?: ISecret[];
  ssmSecrets?: IStringParameter[];
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

interface secretObject {
    objectName: string;
    objectType: string;
}
export class TeamSecrets {

  private secretObjects: secretObject[];

  constructor(private props: TeamSecretsProps) {
    this.secretObjects = [];
  }

  /**
   * Setup the secrets for CSI driver
   * @param clusterInfo
   */
  setupSecrets(clusterInfo: ClusterInfo, team: ApplicationTeam, csiDriver: Construct): void {
    // Create the service account for the team
    this.addPolicyToServiceAccount(team);

    // Create and apply SecretProviderClass manifest
    this.createSecretProviderClass(clusterInfo, team, csiDriver);
  }

  /**
   * Creates Service Account for CSI Secrets driver and sets up the IAM Policies
   * needed to access the AWS Secrets
   * @param team
   */
  private addPolicyToServiceAccount(team: ApplicationTeam) {
    const serviceAccount = team.serviceAccount;
    
    if (this.props.secretsManagerSecrets) {
      this.props.secretsManagerSecrets.forEach( (secretManagerSecret) => {
        this.secretObjects.push ({
          objectName: secretManagerSecret.secretName,
          objectType: AwsSecretType.SECRETSMANAGER
        });
        secretManagerSecret.grantRead(serviceAccount);
      });
    }

    if (this.props.ssmSecrets) {
      this.props.ssmSecrets.forEach( (ssmSecret) => {
        this.secretObjects.push({
          objectName: ssmSecret.parameterName,
          objectType: AwsSecretType.SSMPARAMETER
        })
        ssmSecret.grantRead(serviceAccount);
      });
    }
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
          objects: JSON.stringify(this.secretObjects),
        },
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
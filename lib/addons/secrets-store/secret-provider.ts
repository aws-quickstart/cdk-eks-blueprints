import { ClusterInfo } from '../../spi';
import { ISecret, Secret } from '@aws-cdk/aws-secretsmanager';
import { IStringParameter, StringParameter } from '@aws-cdk/aws-ssm';
import { IKey } from '@aws-cdk/aws-kms';

/**
 * Secret Provider Interface
 * You can provide() your own Secrets
 */
export interface SecretProvider {
  provide(clusterInfo?: ClusterInfo): ISecret | IStringParameter;
}

/**
 * Generate a new Secret on Secrets Manager
 */
export class GenerateSecretManagerProvider implements SecretProvider {

  constructor(private id: string, private secretName: string) {}

  provide(clusterInfo: ClusterInfo): ISecret {
      const secret = new Secret(clusterInfo.cluster.stack, this.id, {
          secretName: this.secretName
      });

      return secret
  }
}

/**
 * Lookup Secret in SecretsManager by Name
 */
export class LookupSecretsManagerSecretByName implements SecretProvider {
  /**
   * @param secretName
   * @param id
   */
  constructor(private secretName: string, private id?: string) {}

  provide(clusterInfo: ClusterInfo): ISecret {
    return Secret.fromSecretNameV2(
      clusterInfo.cluster.stack,
      this.id ?? `${this.secretName}-Lookup`,
      this.secretName
    );
  }
}

/**
 * Lookup Secret in SecretsManager by Arn
 */
 export class LookupSecretsManagerSecretByArn implements SecretProvider {
  /**
   * @param secretArn
   * @param id
   */
  constructor(private secretArn: string, private id?: string) {}

  provide(clusterInfo: ClusterInfo): ISecret {
    return Secret.fromSecretCompleteArn(
      clusterInfo.cluster.stack,
      this.id ?? `${this.secretArn}-Lookup`,
      this.secretArn
    );
  }
}

/**
 * Lookup SSM Parameter Store Secret by Name
 */
 export class LookupSsmSecretByAttrs implements SecretProvider {
  /**
   * @param secretName 
   * @param version 
   * @param encryptionKey 
   * @param simpleName 
   * @param id 
   */
  constructor(
    private secretName: string,
    private version: number,
    private encryptionKey?: IKey,
    private simpleName?: boolean,
    private id?: string,
  ) {}

  /**
   * Lookup the secret string parameter
   * @param clusterInfo 
   * @returns 
   */
  provide(clusterInfo: ClusterInfo): IStringParameter {
    return StringParameter.fromSecureStringParameterAttributes(
      clusterInfo.cluster.stack,
      this.id ?? `${this.secretName}-Lookup`, {
        parameterName: this.secretName,
        version: this.version,
        encryptionKey: this.encryptionKey,
        simpleName: this.simpleName
      }
    );
  }
}
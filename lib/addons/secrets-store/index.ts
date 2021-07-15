import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";

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
   */
  readonly version?: string;

  /**
   * Rotation Poll Interval, e.g. '120s'.
   * If provided, sets auto rotation to true and sets the polling interval.
   */
  readonly rotationPollInterval?: string;

  /**
   * List of provider-specific configuration
   */
  readonly secretsProviderConfigs?: SecretsProviderConfig[];
}

/**
 * Group provider configuration together.
 */
interface SecretsProviderConfig {
  /**
   * Team Namespace. E.g. 'team-Riker'
   */
  readonly namespace: string;

  /**
   * List of Secrets to retrive
   */
  readonly secrets: SecretsConfig[];
}

/**
 * Group Secrets configuration together.
 */
interface SecretsConfig {
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
  version: 'v0.0.23'
}

export class SecretsStoreAddOn implements ClusterAddOn {

  private options: SecretsStoreAddOnProps;

  constructor(props?: SecretsStoreAddOnProps) {
      this.options = { ...SecretsStoreAddOnDefaults, ...props };
  }

  deploy(clusterInfo: ClusterInfo): void {
    /**
     * TODO
     */
  }
}
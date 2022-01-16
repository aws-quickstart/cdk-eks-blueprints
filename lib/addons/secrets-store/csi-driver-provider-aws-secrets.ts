import { ClusterInfo } from '../../spi';
import { CfnOutput, Construct } from '@aws-cdk/core';
import { ISecret } from '@aws-cdk/aws-secretsmanager';
import { IStringParameter } from '@aws-cdk/aws-ssm';
import { SecretProvider } from './secret-provider';
import { ServiceAccount } from '@aws-cdk/aws-eks';
import { SecretsStoreAddOn } from '../..';

/**
 * CsiSecret Props
 */
export interface CsiSecretsProps {
    /**
     * Implementation of the secret provider that returns a reference to an Secrets Manager entry or SSP Parameter.
     */
    secretProvider: SecretProvider;
    
    /**
     * For secrets containing JSON structure, an optional JMES Path (https://jmespath.org/) object to decompose individual keys as separate 
     * secret object data. 
     */
    jmesPath?: JmesPathObject[];
    
    /**
     * Kubernetes secret for cases when CSI secret should create a standard Kubernetes Secret object.
     */
    kubernetesSecret?: KubernetesSecret;
}

export interface JmesPathObject {
    objectAlias: string,
    path: string
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
    jmesPath?: JmesPathObject[];
}

function createParameterObject(csiSecret: CsiSecretsProps, secretName: string, secretType: AwsSecretType) {
    const result: ParameterObject = {
        objectName: secretName,
        objectType: secretType,
    };
    if(csiSecret.jmesPath) {
        result.jmesPath = csiSecret.jmesPath;
    }
    return result;
}


export class CsiSecrets {

    private parameterObjects: ParameterObject[];
    private kubernetesSecrets: KubernetesSecret[];
    private secretProviderClassName: string;

    constructor(private csiSecrets: CsiSecretsProps[], private serviceAccount: ServiceAccount, secretProviderClassName?: string) {
        this.parameterObjects = [];
        this.kubernetesSecrets = [];
        this.secretProviderClassName = secretProviderClassName ?? serviceAccount.serviceAccountName + '-secret-provider';
    }

    /**
     * Setup CSI secrets
     * @param clusterInfo 
     */
    setupSecrets(clusterInfo: ClusterInfo): Promise<Construct> {
        const secretsDriverPromise = clusterInfo.getScheduledAddOn(SecretsStoreAddOn.name);
        console.assert(secretsDriverPromise != null, 'SecretsStoreAddOn is required to setup secrets but is not provided in the add-ons.');

        this.addPolicyToServiceAccount(clusterInfo, this.serviceAccount);

        // Create and apply SecretProviderClass manifest
        return secretsDriverPromise!.then(secretsDriver =>
            this.createSecretProviderClass(clusterInfo, this.serviceAccount, secretsDriver!)
        );
    }

    /**
     * Creates Service Account for CSI Secrets driver and sets up the IAM Policies
     * needed to access the AWS Secrets
     * @param clusterInfo
     * @param serviceAccount
     */
    private addPolicyToServiceAccount(clusterInfo: ClusterInfo, serviceAccount: ServiceAccount) {
        this.csiSecrets.forEach((csiSecret) => {
            const data: KubernetesSecretObjectData[] = [];
            let kubernetesSecret: KubernetesSecret;
            let secretName: string;
            const secret: ISecret | IStringParameter = csiSecret.secretProvider.provide(clusterInfo);

            if (Object.hasOwnProperty.call(secret, 'secretArn')) {
                const secretManagerSecret = secret as ISecret;
                secretName = secretManagerSecret.secretName;
                const parameterObject = createParameterObject(csiSecret, secretName, AwsSecretType.SECRETSMANAGER); 
                this.parameterObjects.push(parameterObject);
                secretManagerSecret.grantRead(serviceAccount);
            }
            else {
                const ssmSecret = secret as IStringParameter;
                secretName = ssmSecret.parameterName;
                const parameterObject = createParameterObject(csiSecret, secretName, AwsSecretType.SSMPARAMETER); 
                this.parameterObjects.push(parameterObject);
                ssmSecret.grantRead(serviceAccount);
            }

            if (csiSecret.kubernetesSecret) {
                if (csiSecret.kubernetesSecret.data) {
                    csiSecret.kubernetesSecret.data.forEach((item) => {
                        const dataObject: KubernetesSecretObjectData = {
                            objectName: item.objectName ?? secretName,
                            key: item.key ?? secretName
                        };
                        data.push(dataObject);
                    });
                }
                else {
                    const dataObject: KubernetesSecretObjectData = {
                        objectName: secretName,
                        key: secretName
                    };
                    data.push(dataObject);
                }
                kubernetesSecret = {
                    secretName: csiSecret.kubernetesSecret.secretName,
                    type: csiSecret.kubernetesSecret.type ?? KubernetesSecretType.OPAQUE,
                    labels: csiSecret.kubernetesSecret.labels ?? undefined,
                    data,
                };
                this.kubernetesSecrets.push(kubernetesSecret);
            }
        });
    }

    /**
     * Create and apply the SecretProviderClass manifest
     * @param clusterInfo
     * @param serviceAccount
     * @param csiDriver
     */
    private createSecretProviderClass(clusterInfo: ClusterInfo, serviceAccount: ServiceAccount, csiDriver: Construct): Construct {
        const cluster = clusterInfo.cluster;
        const secretProviderClass = this.secretProviderClassName;
        const secretProviderClassManifest = cluster.addManifest(secretProviderClass, {
            apiVersion: 'secrets-store.csi.x-k8s.io/v1alpha1',
            kind: 'SecretProviderClass',
            metadata: {
                name: secretProviderClass,
                namespace: serviceAccount.serviceAccountNamespace
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
            serviceAccount,
            csiDriver
        );

        new CfnOutput(clusterInfo.cluster.stack, `${serviceAccount.serviceAccountName}-secret-provider-class `, {
            value: secretProviderClass
        });

        return secretProviderClassManifest;
    }
}

import { ServiceAccount } from 'aws-cdk-lib/aws-eks';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as assert from "assert";
import { SecretsStoreAddOn } from '../..';
import { ClusterInfo, Values } from '../../spi';
import { SecretProvider } from './secret-provider';

/**
 * CsiSecret Props
 */
export interface CsiSecretProps {
    /**
     * Implementation of the secret provider that returns a reference to an Secrets Manager entry or Blueprints Parameter.
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
    labels?: Values;

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

function createParameterObject(csiSecret: CsiSecretProps, secretName: string, secretType: AwsSecretType) {
    const result: ParameterObject = {
        objectName: secretName,
        objectType: secretType,
    };
    if (csiSecret.jmesPath) {
        result.jmesPath = csiSecret.jmesPath;
    }
    return result;
}


export class SecretProviderClass {

    private parameterObjects: ParameterObject[];
    private kubernetesSecrets: KubernetesSecret[];
    private csiSecrets: CsiSecretProps[];
    private secretProviderClassPromise: Promise<Construct>;

    constructor(private clusterInfo: ClusterInfo, private serviceAccount: ServiceAccount, private secretProviderClassName: string, ...csiSecrets: CsiSecretProps[]) {
        this.parameterObjects = [];
        this.kubernetesSecrets = [];
        this.csiSecrets = csiSecrets;
        this.secretProviderClassPromise = this.setupSecrets();
    }

    public addDependent(...constructs: Construct[]) {
        this.secretProviderClassPromise.then(secretProviderClass => {
            constructs.forEach(dependent => dependent.node.addDependency(secretProviderClass));
        });
    }

    /**
     * Optionally returns volume mounts for a pod or helm chart that supports volume mounts.
     */
    public getVolumeMounts(volumeName: string, mountPath?: string): Values {
        return {
            "volumes": [
                {
                    name: volumeName,
                    csi: {
                        driver: "secrets-store.csi.k8s.io",
                        readOnly: true,
                        volumeAttributes: {
                            secretProviderClass: this.secretProviderClassName
                        }
                    }
                }
            ],
            "volumeMounts": [
                {
                    name: volumeName,
                    mountPath: mountPath ?? "/mnt/secret-store"
                }
            ]
        };
    }

    /**
     * Setup CSI secrets
     * @param clusterInfo 
     */
    protected setupSecrets(): Promise<Construct> {
        const secretsDriverPromise = this.clusterInfo.getScheduledAddOn(SecretsStoreAddOn.name);
        assert(secretsDriverPromise != null, 'SecretsStoreAddOn is required to setup secrets but is not provided in the add-ons.');

        this.addPolicyToServiceAccount();

        // Create and apply SecretProviderClass manifest
        return secretsDriverPromise!.then(secretsDriver =>
            this.createSecretProviderClass(secretsDriver!)
        );
    }

    /**
     * Creates Service Account for CSI Secrets driver and sets up the IAM Policies
     * needed to access the AWS Secrets
     * @param clusterInfo
     * @param serviceAccount
     */
    protected addPolicyToServiceAccount() {
        this.csiSecrets.forEach((csiSecret) => {
            const data: KubernetesSecretObjectData[] = [];
            let kubernetesSecret: KubernetesSecret;
            let secretName: string;
            const secret: ISecret | IStringParameter = csiSecret.secretProvider.provide(this.clusterInfo);

            if (Object.hasOwnProperty.call(secret, 'secretArn')) {
                const secretManagerSecret = secret as ISecret;
                secretName = secretManagerSecret.secretName;
                const parameterObject = createParameterObject(csiSecret, secretName, AwsSecretType.SECRETSMANAGER);
                this.parameterObjects.push(parameterObject);
                secretManagerSecret.grantRead(this.serviceAccount);
            }
            else {
                const ssmSecret = secret as IStringParameter;
                secretName = ssmSecret.parameterName;
                const parameterObject = createParameterObject(csiSecret, secretName, AwsSecretType.SSMPARAMETER);
                this.parameterObjects.push(parameterObject);
                ssmSecret.grantRead(this.serviceAccount);
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
    protected createSecretProviderClass(csiDriver: Construct): Construct {
        const cluster = this.clusterInfo.cluster;
        const secretProviderClass = this.secretProviderClassName;
        const secretProviderClassManifest = cluster.addManifest(secretProviderClass, {
            apiVersion: 'secrets-store.csi.x-k8s.io/v1alpha1',
            kind: 'SecretProviderClass',
            metadata: {
                name: secretProviderClass,
                namespace: this.serviceAccount.serviceAccountNamespace
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
            this.serviceAccount,
            csiDriver
        );

        new CfnOutput(cluster.stack, `${this.serviceAccount.serviceAccountName}-secret-provider-class `, {
            value: secretProviderClass
        });

        return secretProviderClassManifest;
    }
}

import { Construct } from '@aws-cdk/core';
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi";
import { setPath, createNamespace } from "../../utils";
import { LookupSecretsManagerSecretByName } from '../secrets-store/secret-provider';
import { CsiSecretProps, SecretProviderClass } from '../secrets-store/csi-driver-provider-aws-secrets';
import { ServiceAccount } from "@aws-cdk/aws-eks";


/**
 * User provided options for the Helm Chart
 */
export interface KubeviousAddOnProps extends HelmAddOnUserProps {
    /**
     * Version of the helm chart to deploy
     */
    version?: string,
    /**
     * Create an ingress for access to Kubevious
     */
    ingressEnabled?: boolean,
    /**
     * Type of service to expose Kubevious UI
     */
    kubeviousServiceType?: string,
    /**
     * Name of the secret to be fetched from secret store that contains MySql DB root password.
     * If not provided, system will generate a random password. Note that secret must already exist
     * in secret manager before deploying Kubevious
     */
    mysqlRootSecretName?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & KubeviousAddOnProps = {
    name: "ssp-kubevious-addon",
    namespace: "kubevious",
    chart: "kubevious",
    version: "0.8.15",
    release: "kubevious",
    repository:  "https://helm.kubevious.io",
    values: {},

    ingressEnabled: false,
    kubeviousServiceType: "ClusterIP",
};

/**
 * Main class to instantiate the Helm chart
 */
export class KubeviousAddOn extends HelmAddOn {

    readonly options: KubeviousAddOnProps;

    constructor(props?: KubeviousAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as KubeviousAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        let values: Values = populateValues(this.options);
        const chart = this.addHelmChart(clusterInfo, values);

        // If a secret name prop was provided, pull the secret from secret manager and use it to generate the MySql pwd
        const secretProviderClass = setupSecret(clusterInfo, this.options, chart);
        if(secretProviderClass) {
            // Ensure secret is created before MySql
            secretProviderClass.addDependent(chart);
        }

        return Promise.resolve(chart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: KubeviousAddOnProps): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "ingress.enabled",  helmOptions.ingressEnabled);
    setPath(values, "kubevious.service.type",  helmOptions.kubeviousServiceType);

    // Generate random MySql password only if we do not have a secret name
    const randomPassword: boolean = helmOptions.mysqlRootSecretName? false : true;
    setPath(values, "mysql.generate_passwords",  randomPassword);

    return values;
}

/**
 * setupSecretProviderClass creates a secret provider class for the MySql password
 *
 * @param clusterInfo: Cluster information
 * @param serviceAccount: Service account associated with the stateful where the secret will be used
 * @param secretName Name of the secret to pull from the secret store
 * @returns SecretProviderClass for the MySql password
 */
function setupSecretProviderClass(clusterInfo: ClusterInfo, serviceAccount: ServiceAccount, secretName: string): SecretProviderClass {

    const csiSecretProps: CsiSecretProps = {
        secretProvider: new LookupSecretsManagerSecretByName(secretName),
        kubernetesSecret: {
            secretName: 'kubevious-mysql-secret-root',
            data: [
                {
                    key: 'MYSQL_ROOT_PASSWORD'
                }
            ]
        }
    };
    return new SecretProviderClass(clusterInfo, serviceAccount, "sql-root-secret-class", csiSecretProps);
}

/**
 * setupSecret pulls a secret from secret manager and applies it as password to MySql if a secret name was provided.
 * @param clusterInfo Cluster information
 * @param helmOptions Options provided by the user
 * @param chart construct used to create Kubevious
 * @returns  SecretProviderClass if the secret name was provided, undefined otherwise
 */
function setupSecret(clusterInfo: ClusterInfo,
                     helmOptions: KubeviousAddOnProps,
                     chart: Construct): SecretProviderClass | undefined {

    let secretProviderClass : SecretProviderClass | undefined;
    const namespace: string =  helmOptions.namespace ? helmOptions.namespace : defaultProps.namespace;
    if (helmOptions.mysqlRootSecretName) {
        const ns = createNamespace(namespace, clusterInfo.cluster, true);
        const serviceAccountName = 'sql-root-secret-sa';
        const sa = clusterInfo.cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: helmOptions.namespace
        });
        sa.node.addDependency(ns);

        secretProviderClass = setupSecretProviderClass(clusterInfo, sa, helmOptions.mysqlRootSecretName);
        // addSecretVolumeAndMount(helmOptions);
        secretProviderClass.addDependent(chart);
    }
    return secretProviderClass;
}
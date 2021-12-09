import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { Construct, Duration } from "@aws-cdk/core";
import { ClusterInfo, Values } from "../..";

/**
 * Structure that defines properties for a generic Helm chart. 
 */
export interface HelmChartConfiguration {
    
    /**
     * Name of the helm chart (add-on)
     */
    name: string,
    
    /**
     * Namespace where helm release will be installed
     */
    namespace: string,

    /**
     * Chart name
     */
    chart: string,

    /**
     * Helm chart version.
     */
    version: string, 

    /**
     * Helm release
     */
    release: string,

    /**
     * Helm repository
     */
    repository: string,

    /**
     * Optional values for the helm chart. 
     */
    values?: Values
}

/**
 * Extends helm chart configurtion (repo/chart) with deployment parameters: values, timeout and wait.
 */
export interface HelmChartDeployment extends Required<HelmChartConfiguration> {
    /**
     * Deployment will wait for all pods to come up.
     */
    wait?: boolean,

    /**
     * Time to wait. 
     */
    timeout?: Duration,
}

/**
 * Data structure defines properties for kubernetes manifest deployment (non-helm).
 */
export interface ManifestConfiguration {
    name: string, 
    namespace: string, 
    manifestUrl: string
}

/**
 * Data structure extends Kubernetes manifest configiuration and allows passing deployment parameters.
 * Such parameters are expected to be templated within values inside the manifest as {{parameter-key}}.
 * For example, if values contains {region: 'us-east-2'} then the manifest is expected to contain 
 * { 'some-attribute' : {{region}}.
 */
export interface ManifestDeployment extends Omit<ManifestConfiguration, "manifestUrl"> {
    manifest: any,
    values: Values
}

/**
 * Kubectl provider for the add-ons and teams that is capable of helm and generic manifest deployments.
 * It exposes extenion mechanism and central points for logging, stack output, extension of functionality.
 */
export class KubectlProvider {

    constructor(private readonly clusterInfo : ClusterInfo) {}

    public static applyHelmDeployment = function(clusterInfo: ClusterInfo, props: HelmChartDeployment) : Construct {
        return clusterInfo.cluster.addHelmChart( props.name, {
            repository: props.repository,
            namespace: props.namespace,
            chart: props.chart,
            version: props.version,
            release: props.release,
            timeout: props.timeout,
            wait: props.wait,
            values: props.values
        });
    };

    /**
     * Simple template provider for manifest based add-ons. 
     * Replaces values in format {{key}} with the values passed in as values.
     * @param document where tempated parameters must be replaced
     * @param values values to replace (e.g. region will be passed as "region: us-west-1" and any occurrence of {{region}} will be replaced)
     * @returns 
     */
    public static applyManifestTemplate = function(document: any, values: Values) : any {
        const valueMap = new Map(Object.entries(values));
        let data = JSON.stringify(document);
        valueMap.forEach((value: string, key: string) => {
            data.replace(`{{${key}}}`, value);
        });
        return JSON.parse(data);
    }

    public static applyManifestDeployment = function(clusterInfo: ClusterInfo, props: ManifestDeployment) {
        const manifestDoc = KubectlProvider.applyManifestTemplate(props.manifest, props.values);
        return  new KubernetesManifest(clusterInfo.cluster, props.name, {
          cluster: clusterInfo.cluster,
          manifest: manifestDoc,
          overwrite: true  
        })
    };

    public addHelmChart(props: HelmChartDeployment) : Construct {
        return KubectlProvider.applyHelmDeployment(this.clusterInfo, props);
    }

    public addManfiest(props: ManifestDeployment) : Construct {
        return KubectlProvider.applyManifestDeployment(this.clusterInfo, props);
    }
}



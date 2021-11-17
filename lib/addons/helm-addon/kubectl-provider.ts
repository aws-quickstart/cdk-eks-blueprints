import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { Construct } from "@aws-cdk/core";
import { ClusterInfo, Values } from "../..";


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

type HelmChartDeployment = Required<HelmChartConfiguration>;

export interface ManifestConfiguration {
    name: string, 
    namespace: string, 
    manifestUrl: string
}

export interface ManifestDeployment extends Omit<ManifestConfiguration, "manifestUrl"> {
    manifest: any,
    values: Values
}

export class KubectlProvider {

    constructor(private readonly clusterInfo : ClusterInfo) {}

    public static helmProvider = function(clusterInfo: ClusterInfo, props: HelmChartDeployment) : Construct {
        return clusterInfo.cluster.addHelmChart( props.name, {
            namespace: props.namespace,
            chart: props.chart,
            version: props.version,
            release: props.release,
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
    public static manifestTemplateProvider = function(document: any, values: Values) : any {
        const valueMap = new Map(Object.entries(values));
        let data = JSON.stringify(document);
        valueMap.forEach((value: string, key: string) => {
            data.replace(`{{${key}}}`, value);
        });
        return JSON.parse(data);
    }

    public static manifestProvider = function(clusterInfo: ClusterInfo, props: ManifestDeployment) {
        const manifestDoc = KubectlProvider.manifestTemplateProvider.call(undefined, props.manifest, props.values);
        return  new KubernetesManifest(clusterInfo.cluster, props.name, {
          cluster: clusterInfo.cluster,
          manifest: manifestDoc,
          overwrite: true  
        })
    };

    public addHelmChart(props: HelmChartDeployment) : Construct {
        return KubectlProvider.helmProvider.call(this, this.clusterInfo, props);
    }

    public addManfiest(props: ManifestDeployment) : Construct {
        return KubectlProvider.manifestProvider.call(this, this.clusterInfo, props);
    }
}



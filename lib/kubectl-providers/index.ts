import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { Construct } from "@aws-cdk/core";
import { ClusterInfo, Values } from "..";


export interface HelmChartConfiguration {
    name: string,
    namespace: string,
    chart: string,
    release: string,
    repository: string,
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

function replaceDocument(document: any, values: Values) : any {
    const valueMap = new Map(Object.entries(values));
    let data = JSON.stringify(document);
    valueMap.forEach((value: string, key: string) => {
        data.replace(`{{${key}}}`, value);
    });
    return JSON.parse(data);
}


export class KubectlProvider {

    constructor(private readonly clusterInfo : ClusterInfo) {}

    public static helmProvider = function(clusterInfo: ClusterInfo, props: HelmChartDeployment) : Construct {
        return clusterInfo.cluster.addHelmChart( props.name, {
            namespace: props.namespace,
            chart: props.chart,
            release: props.release,
            values: props.values
        });
    };

    public static manifestProvider = function(clusterInfo: ClusterInfo, props: ManifestDeployment) {
        const manifestDoc = replaceDocument(props.manifest, props.values);
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



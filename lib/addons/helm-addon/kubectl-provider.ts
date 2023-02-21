import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
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
    namespace: string | undefined,

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
     * When global helm version validation is enabled with HelmAddOn.validateHelmVersions = true
     * allows to skip validation for a particular helm add-on. 
     */
    skipVersionValidation?: boolean,

    /**
     * Optional values for the helm chart. 
     */
    values?: Values

    /**
     * Indicate the helm chart provided uses dependency mode (https://helm.sh/docs/helm/helm_dependency/).
     * Dependency mode is widely used in `aws-samples/eks-blueprints-add-ons` repository, for example:
     * https://github.com/aws-samples/eks-blueprints-add-ons/blob/main/add-ons/appmesh-controller/Chart.yaml
     * Dependency mode requires the chart values to be wrapped within the chart name.
     * This value is only used to turn off dependency mode in case customers choose to copy the whole helm chart into their repo
     * @default true
     */
    dependencyMode?: boolean
}

/**
 * Extends helm chart configuration (repo/chart) with deployment parameters: values, timeout and wait.
 */
export interface HelmChartDeployment extends Required<Omit<HelmChartConfiguration, "skipVersionValidation">> {
    /**
     * Deployment will wait for all pods to come up.
     */
    wait?: boolean;

    /**
     * Time to wait. 
     */
    timeout?: Duration;

    /**
     * Creates namespace if does not exist
     */
    createNamespace?: boolean;
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
 * Data structure extends Kubernetes manifest configuration and allows passing deployment parameters.
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
 * It exposes extension mechanism and central points for logging, stack output, extension of functionality.
 */
export class KubectlProvider {

    constructor(private readonly clusterInfo: ClusterInfo) { }

    public static applyHelmDeployment = function (clusterInfo: ClusterInfo, props: HelmChartDeployment): Construct {
        return clusterInfo.cluster.addHelmChart(props.name, {
            repository: props.repository,
            namespace: props.namespace,
            createNamespace: props.createNamespace,
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
     * @param document where templated parameters must be replaced
     * @param values values to replace (e.g. region will be passed as "region: us-west-1" and any occurrence of {{region}} will be replaced)
     * @returns 
     */
    public static applyManifestTemplate = function (document: any, values: Values): any {
        const valueMap = new Map(Object.entries(values));
        let data = JSON.stringify(document);
        valueMap.forEach((value: any, key: string) => {
            data = data.replace(new RegExp(`{{${key}}}`, 'g'), value);
        });
        return JSON.parse(data);
    };

    public static applyManifestDeployment = function (clusterInfo: ClusterInfo, props: ManifestDeployment) {
        const manifestDoc = KubectlProvider.applyManifestTemplate(props.manifest, props.values);
        return new KubernetesManifest(clusterInfo.cluster, props.name, {
            cluster: clusterInfo.cluster,
            manifest: manifestDoc,
            overwrite: true
        });
    };

    public addHelmChart(props: HelmChartDeployment): Construct {
        return KubectlProvider.applyHelmDeployment(this.clusterInfo, props);
    }

    public addManifest(props: ManifestDeployment) : Construct {
        return KubectlProvider.applyManifestDeployment(this.clusterInfo, props);
    }
}



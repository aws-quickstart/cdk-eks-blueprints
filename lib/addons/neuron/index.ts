import { Construct } from "constructs";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { createNamespace, dependable } from "../../utils";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { NeuronMonitorManifest } from "./neuron-monitor-customization";

const PLUGIN_URL = "https://raw.githubusercontent.com/aws-neuron/aws-neuron-sdk/master/src/k8/k8s-neuron-device-plugin.yml";
const RBAC_URL = "https://raw.githubusercontent.com/aws-neuron/aws-neuron-sdk/master/src/k8/k8s-neuron-device-plugin-rbac.yml";

export class NeuronDevicePluginAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const kubectlProvider = new KubectlProvider(clusterInfo);

        // Read in YAML docs
        const rbac = loadExternalYaml(RBAC_URL);
        const rbacManifest: ManifestDeployment = {
            name: "neuron-rbac-manifest",
            namespace: "",
            manifest: rbac,
            values: {}
        };

        const plugin = loadExternalYaml(PLUGIN_URL);
        const pluginManifest: ManifestDeployment = {
            name: "neuron-plugin-manifest",
            namespace: "kube-system",
            manifest: plugin,
            values: {}
        };

        const rbacStatement = kubectlProvider.addManifest(rbacManifest);
        const pluginStatement = kubectlProvider.addManifest(pluginManifest);

        // Plugin dependency on the RBAC manifest
        pluginStatement.node.addDependency(rbacStatement);

        return Promise.resolve(pluginStatement);
    }
}

export interface NeuronMonitorAddOnProps {
    /**
     * The tag of the Neuron Monitor application's Docker image.
     * @default 'latest'
     */
    imageTag?: string;
    /**
     * Neuron Application's namespace
     * @default 'kube-system'
     */
    namespace?: string;
     /**
     * Application's port
     * @default 9010
     */
     port?: number;
     /**
     * To Create Namespace using CDK. This should be done only for the first time.
     */    
    createNamespace?: boolean;
}

const defaultProps: NeuronMonitorAddOnProps = {
    namespace: "kube-system",
    imageTag: "1.0.0",
    port: 9010
};


export class NeuronMonitorAddOn implements ClusterAddOn {

    readonly options: NeuronMonitorAddOnProps;

    constructor(props?: NeuronMonitorAddOnProps){
        this.options = {...defaultProps, ...props};
    }

    @dependable(NeuronDevicePluginAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct>{
        
        const cluster = clusterInfo.cluster;

        const manifest = new NeuronMonitorManifest().generate(this.options.namespace!, this.options.imageTag!, this.options.port!);

        const neuronMonitorManifest = new KubernetesManifest(cluster.stack, "neuron-monitor-manifest", {
            cluster,
            manifest: manifest,
            overwrite: true
        });

        if(this.options.createNamespace === true){
            // Let CDK Create the Namespace
            const namespace = createNamespace(this.options.namespace! , cluster);
            neuronMonitorManifest.node.addDependency(namespace);
          }

        return Promise.resolve(neuronMonitorManifest);

    }
}

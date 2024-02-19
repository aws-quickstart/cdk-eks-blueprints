import { Construct } from "constructs";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { readYamlDocument, loadYaml, loadExternalYaml } from "../../utils/yaml-utils";
import { dependable } from "../../utils";

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

export class NeuronMonitorAddOn implements ClusterAddOn {

    @dependable(NeuronDevicePluginAddOn.name)
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;

        const neuronMonitorDoc = readYamlDocument(__dirname + '/neuron-monitor.yaml');
        const neuronMonitorManifest = neuronMonitorDoc.split("---").map(e => loadYaml(e));

        new KubernetesManifest(cluster.stack, "neuron-monitor-manifest", {
            cluster,
            manifest: neuronMonitorManifest,
            overwrite: true
        });
    }
}

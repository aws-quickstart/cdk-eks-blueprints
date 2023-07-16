import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";

export class NeuronPluginAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;

        // Read in YAML docs
        const rbac = readYamlDocument(__dirname + '/k8s-neuron-device-plugin-rbac.ytpl');
        const plugin = readYamlDocument(__dirname + '/k8s-neuron-device-plugin.ytpl');
        
        // Apply Manifests
        const rbacLoadYaml = rbac.split("---").map(e => loadYaml(e));
        const rbacManifest = new KubernetesManifest(cluster.stack, "neuron-rbac-manifest", {
            cluster,
            manifest: rbacLoadYaml,
            overwrite: true
        });

        const pluginLoadYaml = plugin.split("---").map(e => loadYaml(e));
        const pluginManifest = new KubernetesManifest(cluster.stack, "neuron-plugin-manifest", {
            cluster,
            manifest: pluginLoadYaml,
            overwrite: true
        });

        // Plugin dependency on the RBAC manifest
        pluginManifest.node.addDependency(rbacManifest);
    }
}
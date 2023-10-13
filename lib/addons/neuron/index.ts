<<<<<<< HEAD
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
=======
import { Construct } from "constructs";

import { ClusterAddOn, ClusterInfo } from "../../spi";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { loadExternalYaml } from "../../utils/yaml-utils";

const PLUGIN_URL = "https://raw.githubusercontent.com/aws-neuron/aws-neuron-sdk/master/src/k8/k8s-neuron-device-plugin.yml";
const RBAC_URL = "https://raw.githubusercontent.com/aws-neuron/aws-neuron-sdk/master/src/k8/k8s-neuron-device-plugin-rbac.yml";

export class NeuronPluginAddOn implements ClusterAddOn {
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
>>>>>>> 38b70f6d (test fix, lint fix, and removed local testing example blueprint)
    }
}
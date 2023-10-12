import { Construct } from "constructs";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";

import { ClusterAddOn, ClusterInfo } from "../../spi";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";
import { loadYaml, loadExternalYaml } from "../../utils/yaml-utils";

const PLUGIN_URL = "https://github.com/aws-neuron/aws-neuron-sdk/blob/master/src/k8/k8s-neuron-device-plugin.yml"
const RBAC_URL = "https://github.com/aws-neuron/aws-neuron-sdk/blob/master/src/k8/k8s-neuron-device-plugin-rbac.yml"

export class NeuronPluginAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const kubectlProvider = new KubectlProvider(clusterInfo);

        // Read in YAML docs
        const rbac = loadExternalYaml(RBAC_URL);
        const plugin = loadExternalYaml(PLUGIN_URL);
        
        // Apply Manifests
        const rbacLoadYaml = rbac.split("---").map((e: any) => loadYaml(e));
        const rbacManifest = new KubernetesManifest(cluster.stack, "neuron-rbac-manifest", {
            cluster,
            manifest: rbacLoadYaml,
            overwrite: true
        });

        const pluginLoadYaml = plugin.split("---").map((e: any) => loadYaml(e));
        const pluginManifest = new KubernetesManifest(cluster.stack, "neuron-plugin-manifest", {
            cluster,
            manifest: pluginLoadYaml,
            overwrite: true
        });

        // Plugin dependency on the RBAC manifest
        pluginManifest.node.addDependency(rbacManifest);

        return Promise.resolve(pluginManifest);
    }
}
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class CalicoNetworkPolicyAddon implements ClusterAddOn {

  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;

    let doc = readYamlDocument(__dirname + '/calico-1.7.1.yaml');
    let docArray = doc.split("---").map(e => loadYaml(e));
    let manifest = new KubernetesManifest(cluster.stack, "calico-network-policy", {
      cluster,
      manifest: docArray
    });
  }
}
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class CalicoNetworkPolicyAddon implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
    const cluster = stack.cluster;

    let doc = readYamlDocument(__dirname + '/calico-1.7.1.yaml');
    let docArray = doc.split("---").map(e => loadYaml(e));
    let manifest = new KubernetesManifest(stack, "calico-network-policy", {
      cluster,
      manifest: docArray
    });
  }

}
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class ArgoCDAddOn implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
    const cluster = stack.cluster;

    const argons = cluster.addManifest('argocd', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'argocd' }
    });
    let doc = readYamlDocument('./lib/addons/argocd/install.yaml');
    let docArray = doc.split("---").map(e => loadYaml(e));
    docArray.forEach(e => e['metadata']['namespace'] = "argocd");
    let manifest = new KubernetesManifest(stack, "argocd", {
      cluster,
      manifest: docArray
    });
    manifest.node.addDependency(argons);
  }
}
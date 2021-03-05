import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class ArgoCDAddOn implements ClusterAddOn {

  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;

    const argons = cluster.addManifest('argocd', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'argocd' }
    });
    let doc = readYamlDocument(__dirname + '/install.yaml');
    let docArray = doc.split("---").map(e => loadYaml(e));
    docArray.forEach(e => e['metadata']['namespace'] = "argocd");
    let manifest = new KubernetesManifest(cluster.stack, "argocd", {
      cluster,
      manifest: docArray
    });
    manifest.node.addDependency(argons);
  }
}
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class ArgoCDAddon implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            repository: "https://argoproj.github.io/argo-helm",
            namespace: "argo-cd"
        });
    }
}
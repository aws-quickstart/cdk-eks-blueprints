import { ClusterAddOn, ClusterInfo } from "../../stacks/eks-blueprint-stack";

export class ArgoCDAddon implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            repository: "https://argoproj.github.io/argo-helm",
            version: '3.2.3',
            namespace: "argocd",
        });
    }
}
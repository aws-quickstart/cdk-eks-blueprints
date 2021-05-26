import { ClusterAddOn, ClusterInfo } from "../../stacks/eks-blueprint-stack";

export class ArgoCDAddOn implements ClusterAddOn {

    readonly namespace : string;

    constructor(namespace?: string) {
        this.namespace = namespace ?? "argocd";
    }

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            repository: "https://argoproj.github.io/argo-helm",
            version: '3.2.3',
            namespace: this.namespace,
        });
    }
}
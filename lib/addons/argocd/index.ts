import { ClusterAddOn, ClusterInfo, ClusterPostDeploy } from "../../stacks/cluster-types";
import { Team } from "../../teams";

export class ArgoCDAddOn implements ClusterAddOn, ClusterPostDeploy {

    readonly namespace: string;

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

    postDeploy(clusterInfo: ClusterInfo, teams: Team[]): void {
        //TODO: implement this method
        console.assert(clusterInfo !== null && teams !== null);
    }
}
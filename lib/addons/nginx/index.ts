import { ClusterAddOn, ClusterInfo } from "../../stacks/eks-blueprint-stack";

export class NginxAddOn implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("ngninx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system",
            version: "0.9.1"
        });
    }
}
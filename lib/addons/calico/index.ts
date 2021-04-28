import { ClusterAddOn, ClusterInfo } from "../../stacks/eks-blueprint-stack";

export class CalicoAddon implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("calico-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            namespace: "kube-system"
        });
    }
}
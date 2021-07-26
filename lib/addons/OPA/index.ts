import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";

export class OpaAddOn implements OpaAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("OPA-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            version: "3.6.0-beta.2",
            namespace: "kube-system"
        });
    }
}
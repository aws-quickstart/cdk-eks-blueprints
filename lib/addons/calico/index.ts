import { ClusterAddOn, ClusterInfo } from "../../spi";

export class CalicoAddOn implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("calico-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            version: "0.3.4",
            namespace: "kube-system"
        });
    }
}

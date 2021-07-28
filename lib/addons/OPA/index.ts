import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";

export class OpaAddOn implements OpaAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("OPA-addon", {
            chart: "gatekeeper",
            release: "gatekeeper",
            repository: "https://open-policy-agent.github.io/gatekeeper/charts",
            version: "3.6.0-beta.2",
            namespace: "kube-system"
        });
    }
}
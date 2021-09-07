import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../stacks/cluster-types";

export class KubeProxyAddOn implements ClusterAddOn {

    version: string;

    constructor(version?: string) {
        this.version = version ?? "v1.19.6-eksbuild.2";
    }
    
    deploy(clusterInfo: ClusterInfo): void {
        new CfnAddon(clusterInfo.cluster.stack, "kube-proxy-addon", {
            addonName: "kube-proxy",
            addonVersion: this.version,
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts:  "OVERWRITE"
        });
    }
}
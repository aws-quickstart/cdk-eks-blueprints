import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../stacks/cluster-types";

export class CoreDnsAddOn implements ClusterAddOn {

    version: string;

    constructor(version?: string) {
        this.version = version ?? "v1.8.0-eksbuild.1";
    }
    
    deploy(clusterInfo: ClusterInfo): void {
        new CfnAddon(clusterInfo.cluster.stack, "coredns-addon", {
            addonName: "coredns",
            addonVersion: this.version,
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts:  "OVERWRITE"
        });
    }
}

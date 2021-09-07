import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../stacks/cluster-types";

export class VpcCniAddOn implements ClusterAddOn {

    version: string;

    constructor(version?: string) {
        this.version = version ?? "v1.7.5-eksbuild.2";
    }
    
    deploy(clusterInfo: ClusterInfo): void {
        new CfnAddon(clusterInfo.cluster.stack, "vpc-cni-addon", {
            addonName: "vpc-cni",
            addonVersion: this.version,
            clusterName: clusterInfo.cluster.clusterName,
            resolveConflicts:  "OVERWRITE"
        });
    }
}
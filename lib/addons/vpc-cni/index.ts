import { CfnAddon, ServiceAccount, Cluster } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { DefaultTeamRoles } from "../../teams/default-team-roles";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn implements ClusterAddOn {

    version: string;

    constructor(version?: string) {
        this.version = version ?? "v1.7.5-eksbuild.2";
    }
    
    deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;
       
        const roleArn = this.createServiceAccountRole(cluster);
       
        const addOn= new CfnAddon(clusterInfo.cluster.stack, "vpc-cni-addon", {
            addonName: "vpc-cni",
            addonVersion: this.version,
            clusterName: cluster.clusterName,
            resolveConflicts:  "OVERWRITE",
            serviceAccountRoleArn: roleArn
        });
    }

    /**
     * Creates a service account that has access to modify the IP address configuration on EKS worker nodes and returns the associted role arn.
     * @param clusterInfo 
     * @returns 
     */
     protected createServiceAccountRole(cluster: Cluster): string {
        const sa = cluster.addServiceAccount('vpc-cni-sa', {
            name: "vpc-cni-sa",
            namespace: "kube-system"
        });

        const vpcCniPolicy = ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy");
        sa.role.addManagedPolicy(vpcCniPolicy);
        return sa.role.roleArn;
    }
}
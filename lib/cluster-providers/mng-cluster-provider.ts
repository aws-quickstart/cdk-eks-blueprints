import { aws_autoscaling as asg, aws_eks as eks } from "aws-cdk-lib";
// Cluster
import { ClusterInfo } from "..";
import { defaultOptions, GenericClusterProvider } from "./generic-cluster-provider";
// Constants 
import { ManagedNodeGroup } from "./types";


/**
 * Configuration options for the cluster provider.
 */
export interface MngClusterProviderProps extends eks.CommonClusterOptions, Omit<ManagedNodeGroup, "id"> {
    /**
    * The name for the cluster.
    * @deprecated use #clusterName
    */
    name?: string;

    /**
     * In this case id is optional and defaults tp the cluster name
     */
    id?: string,

    /**
     * Is it a private only EKS Cluster?
     * Defaults to private_and_public cluster, set to true for private cluster
     * @default false
     */
    privateCluster?: boolean;

}

/**
 * MngClusterProvider provisions an EKS cluster with a managed node group for managed capacity.
 */
export class MngClusterProvider extends GenericClusterProvider {

    constructor(props?: MngClusterProviderProps) {
        super({...defaultOptions, ...props, ...{
            managedNodeGroups: [{
                ...props as Omit<ManagedNodeGroup, "id">,
                id: props?.id ?? props?.clusterName ?? "eks-blueprints-mng",
            }]
        }});
    }
}

/**
 * Validates that cluster is backed by EC2 either through a managed node group or through a self-managed autoscaling group.
 * @param clusterInfo 
 * @param source Used for error message to identify the source of the check
 * @returns 
 */
//TODO: move to clusterInfo
export function assertEC2NodeGroup(clusterInfo: ClusterInfo, source: string): eks.Nodegroup[] | asg.AutoScalingGroup[] {
    if(clusterInfo.nodeGroups != undefined && clusterInfo.nodeGroups.length > 0) {
        return clusterInfo.nodeGroups;
    }
    if(clusterInfo.autoscalingGroups != undefined && clusterInfo.autoscalingGroups.length > 0) {
        return clusterInfo.autoscalingGroups;
    }
    throw new Error(`${source} is supported with EKS EC2 only`);
}
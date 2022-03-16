import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";
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

    /**
     * Affects both control plane and the managed node group.
     */
    vpcSubnets?: ec2.SubnetSelection[];
}

/**
 * MngClusterProvider provisions an EKS cluster with a managed node group for managed capacity.
 */
export class MngClusterProvider extends GenericClusterProvider {

    constructor(props?: MngClusterProviderProps) {
        super({...defaultOptions, ...props, ...{
            managedNodeGroups: [{
                id: props?.id ?? props?.clusterName ?? "eks-ssp-mng",
                amiReleaseVersion: props?.amiReleaseVersion,
                customAmi: props?.customAmi,
                amiType: props?.amiType,
                desiredSize: props?.desiredSize,
                instanceTypes: props?.instanceTypes,
                maxSize: props?.maxSize,
                minSize: props?.minSize,
                nodeGroupCapacityType: props?.nodeGroupCapacityType,
                vpcSubnets: props?.vpcSubnets,
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
export function assertEC2NodeGroup(clusterInfo: ClusterInfo, source: string): eks.Nodegroup[] | AutoScalingGroup[] {
    if(clusterInfo.nodeGroups != undefined && clusterInfo.nodeGroups.length > 0) {
        return clusterInfo.nodeGroups;
    }
    if(clusterInfo.autoscalingGroups != undefined && clusterInfo.autoscalingGroups.length > 0) {
        return clusterInfo.autoscalingGroups;
    }
    throw new Error(`${source} is supported with EKS EC2 only`);
}
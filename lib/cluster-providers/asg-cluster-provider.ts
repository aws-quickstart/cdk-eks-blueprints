import * as eks from "aws-cdk-lib/aws-eks";
import { defaultOptions, GenericClusterProvider } from "./generic-cluster-provider";
import { AutoscalingNodeGroup } from "./types";

/**
 * Configuration options for the cluster provider.
 */
export interface AsgClusterProviderProps extends eks.CommonClusterOptions, AutoscalingNodeGroup {
    
    /**
     * The name for the cluster.
     */
    name?: string;

    /**
     * Is it a private only EKS Cluster?
     * Defaults to private_and_public cluster, set to true for private cluster
     * @default false
     */
    privateCluster?: boolean;

}

/**
 * AsgClusterProvider provisions an EKS cluster with an autoscaling group for self-managed capacity.
 */
export class AsgClusterProvider extends GenericClusterProvider {

    constructor(props?: AsgClusterProviderProps) {
        super({...defaultOptions, ...props, ...{
            autoscalingNodeGroups: [{
                id: props?.id ?? props?.clusterName ?? "eks-blueprints-asg",
                ...props as Omit<AutoscalingNodeGroup, "id">
            }]
        }});
    }
 }

import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";
import { SelfManagedNodeGroup } from "./types";
import { GenericClusterProvider, defaultOptions } from "./generic-cluster-provider";

/**
 * Configuration options for the cluster provider.
 */
export interface AsgClusterProviderProps extends eks.CommonClusterOptions, SelfManagedNodeGroup {
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

    /**
     * Affects both control plane and the managed node group.
    */
    vpcSubnets?: ec2.SubnetSelection[];
}

/**
 * AsgClusterProvider provisions an EKS cluster with an autoscaling group for self-managed capacity.
 */
export class AsgClusterProvider extends GenericClusterProvider {

    constructor(props?: AsgClusterProviderProps) {
        super({...defaultOptions, ...props, ...{
            selfManagedNodeGroups: [{
                id: props?.id ?? props?.clusterName ?? "eks-ssp-asg",
                desiredSize: props?.desiredSize,
                maxSize: props?.maxSize,
                minSize: props?.minSize,
                vpcSubnets: props?.vpcSubnets,
                instanceType: props?.instanceType,
                machineImageType: props?.machineImageType,
                updatePolicy: props?.updatePolicy
            }]
        }});
    }
 }

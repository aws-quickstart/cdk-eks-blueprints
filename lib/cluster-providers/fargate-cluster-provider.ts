import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { defaultOptions, GenericClusterProvider } from './generic-cluster-provider';

/**
 * Configuration options for the cluster provider.
 */
export interface FargateClusterProviderProps extends eks.CommonClusterOptions {

    /**
    * The name for the cluster.
    */
    name?: string

    /**
     * The Fargate for the cluster.
     */
    fargateProfiles?: Map<string, eks.FargateProfileOptions>,

    /**
     * Subnets are passed to the cluster configuration.
     */
    vpcSubnets?: ec2.SubnetSelection[];

    /**
     * Is it a private only EKS Cluster?
     * Defaults to private_and_public cluster, set to true for private cluster
     * @default false
     */
    privateCluster?: boolean;
}

/**
 * FargateClusterProvider provisions an EKS cluster with Fargate capacity only.
 */
export class FargateClusterProvider extends GenericClusterProvider {

    constructor(props?: FargateClusterProviderProps) {
        super({...defaultOptions, ...props, ...{
                fargateProfiles: Object.fromEntries(props?.fargateProfiles ?? new Map())
            }
        });
    }

    /**
     * @override
     */
    internalCreateCluster(scope: Construct, id: string, clusterOptions: any): eks.Cluster {
        return new eks.FargateCluster(scope, id, clusterOptions);
    }    
}
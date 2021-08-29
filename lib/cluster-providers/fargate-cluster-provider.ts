import { Construct } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";

// Cluster
import { ClusterInfo, ClusterProvider } from "..";

// Utils 
import { valueFromContext } from '../utils/context-utils'

// Constants 
import * as constants from './constants'

/**
 * Configuration options for the cluster provider.
 */
export interface FargateClusterProviderProps extends eks.CommonClusterOptions {
    /**
     * The Fargate for the cluster.
     */
    fargateProfiles: Map<string, eks.FargateProfileOptions>,

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
 * FargateClusterProvider provisions an EKS cluster with Fargate capacity.
 */
export class FargateClusterProvider implements ClusterProvider {

    readonly props: FargateClusterProviderProps;

    constructor(props?: FargateClusterProviderProps) {
        this.props = props ?? {
            version: eks.KubernetesVersion.V1_20,
            fargateProfiles: new Map<string, eks.FargateProfileOptions>()
        };
    }

    createCluster(scope: Construct, vpc: ec2.IVpc, name: string): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const version = this.props.version
        const privateCluster = this.props.privateCluster ?? valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = (privateCluster === true) ? [{ subnetType: ec2.SubnetType.PRIVATE }] : this.props.vpcSubnets;

        const cluster = new eks.FargateCluster(scope, id, {
            vpc: vpc,
            clusterName: name ?? id,
            outputClusterName: true,
            version: version,
            vpcSubnets,
            endpointAccess,
        });

        // Provision our Fargate profiles.
        for (const [id, options] of this.props.fargateProfiles) {
            cluster.addFargateProfile(id, options);
        }

        return new ClusterInfo(cluster, version)
    }
}
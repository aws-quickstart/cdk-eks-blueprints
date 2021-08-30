import { Construct } from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { InstanceType, IVpc, SubnetSelection, SubnetType } from "@aws-cdk/aws-ec2";

// Cluster
import { ClusterInfo, ClusterProvider } from "..";

// Utils 
import { valueFromContext } from '../utils/context-utils'

// Constants 
import * as constants from './constants'

/**
 * Configuration options for the cluster provider.
 */
export interface MngClusterProviderProps extends eks.CommonClusterOptions {
    /**
    * The name for the cluster.
    */
    name?: string

    /**
     * Min size of the node group
     * @default 1
     */
    minSize?: number;

    /**
     * Max size of the node group.
     * @default 3
     */
    maxSize?: number;

    /**
     * Desired size, defaults to min size.
     */
    desiredSize?: number;

    /**
     * Instance types used for the node group. Multiple types makes sense if capacity type is SPOT.
     * @default m5.large
     */
    instanceTypes?: InstanceType[];

    /**
     * Choose AMI type for the managed node group.
     */
    amiType?: eks.NodegroupAmiType.AL2_X86_64;

    /**
     * This property is used to upgrade node groups to the latest kubelet by upgrading node group AMI.
     * Look up the versions here (mapped to Kubernetes version): https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html
     */
    amiReleaseVersion?: string;

    /**
     * Select either SPOT or ON-DEMAND
     */
    nodeGroupCapacityType?: eks.CapacityType;

    /**
     * Subnets are passed to the cluster configuration.
     */
    vpcSubnets?: SubnetSelection[];

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
export class MngClusterProvider implements ClusterProvider {

    readonly props: MngClusterProviderProps;

    constructor(props?: MngClusterProviderProps) {
        this.props = props ?? { version: eks.KubernetesVersion.V1_20 };
    }

    createCluster(scope: Construct, vpc: IVpc, name?: string): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.name ?? id
        const outputClusterName = true
        const version = this.props.version
        const privateCluster = this.props.privateCluster ?? valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = (privateCluster === true) ? [{ subnetType: SubnetType.PRIVATE }] : this.props.vpcSubnets;

        // Create an EKS Cluster
        const cluster = new eks.Cluster(scope, id, {
            vpc,
            clusterName,
            outputClusterName,
            version,
            vpcSubnets,
            endpointAccess,
            defaultCapacity: 0 // we want to manage capacity ourselves
        });

        // Props for the managed node group.
        const amiType = this.props.amiType
        const capacityType = this.props.nodeGroupCapacityType
        const releaseVersion = this.props.amiReleaseVersion
        const instanceTypes = this.props.instanceTypes ?? [valueFromContext(scope, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE)];
        const minSize = this.props.minSize ?? valueFromContext(scope, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = this.props.maxSize ?? valueFromContext(scope, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = this.props.desiredSize ?? valueFromContext(scope, constants.DESIRED_SIZE_KEY, minSize);

        // Create a managed node group.
        const mng = cluster.addNodegroupCapacity(id + "-ng", {
            amiType,
            capacityType,
            instanceTypes,
            minSize,
            maxSize,
            desiredSize,
            releaseVersion
        });
        return new ClusterInfo(cluster, version, mng)
    }
}

/**
 * Validates that cluster is backed by EC2 either through a managed node group or through a self-managed autoscaling group.
 * @param clusterInfo 
 * @param source Used for error message to identify the source of the check
 * @returns 
 */
export function assertEC2NodeGroup(clusterInfo: ClusterInfo, source: string): eks.Nodegroup | AutoScalingGroup {
    console.assert(clusterInfo.nodeGroup, `${source} is supported with EKS EC2 only`);
    return clusterInfo.nodeGroup!;
}
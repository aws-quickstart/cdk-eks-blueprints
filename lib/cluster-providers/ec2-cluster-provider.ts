import { Construct } from "@aws-cdk/core";

import { InstanceType, InstanceClass, InstanceSize, IVpc, SubnetSelection, SubnetType } from "@aws-cdk/aws-ec2";
import { CapacityType, Cluster, CommonClusterOptions, KubernetesVersion, NodegroupAmiType, EndpointAccess, Nodegroup } from "@aws-cdk/aws-eks";
import { ClusterInfo, ClusterProvider } from "../stacks/cluster-types";

// Utils 
import { valueFromContext } from '../utils/context-utils'
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";

/**
 * Default instance type for managed node group provisioning
 */
const DEFAULT_INSTANCE_TYPES = [InstanceType.of(InstanceClass.M5, InstanceSize.LARGE)];

/**
 * Default min size of MNG
 */
const DEFAULT_NG_MINSIZE = 1;

/**
 * Default max size for MNG
 */
const DEFAULT_NG_MAXSIZE = 3;

const INSTANCE_TYPE_KEY = "eks.default.instance-type";

const MIN_SIZE_KEY = "eks.default.min-size";

const MAX_SIZE_KEY = "eks.default.max-size";

const DESIRED_SIZE_KEY = "eks.default.desired-size";

const PRIVATE_CLUSTER = "eks.default.private-cluster";

/**
 * EC2 provider configuration options.
 */
export interface EC2ProviderClusterProps extends CommonClusterOptions {

    /**
     * Min size of the node group
     */
    minSize?: number;

    /**
     * Max size of the node group.
     */
    maxSize?: number;

    /**
     * Desired size, defaults to min size.
     */
    desiredSize?: number;

    /**
     * Instance types used for the node group. Mulitple types makes sense if capacity type is SPOT.
     */
    instanceTypes?: InstanceType[]; // m5.large

    /**
     * Choose AMI type for the managed node group.
     */
    amiType?: NodegroupAmiType.AL2_X86_64;

    /**
     * This property is used to upgrade node groups to the latest kubelet by upgrading node group AMI.
     * Look up the versions here (mapped to Kubernetes version): https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html
     */
    amiReleaseVersion?: string;

    /**
     * Select either SPOT or ON-DEMAND
     */
    nodeGroupCapacityType?: CapacityType;

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
 * Base implementation of an EC2 cluster provider with managed node group.
 */
export class EC2ClusterProvider implements ClusterProvider {

    readonly options: EC2ProviderClusterProps;


    constructor(options?: EC2ProviderClusterProps) {
        this.options = options ?? { version: KubernetesVersion.V1_20 };
    }

    createCluster(scope: Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const instanceTypes = this.options.instanceTypes ?? valueFromContext(scope, INSTANCE_TYPE_KEY, DEFAULT_INSTANCE_TYPES);
        const minSize = this.options.minSize ?? valueFromContext(scope, MIN_SIZE_KEY, DEFAULT_NG_MINSIZE);
        const maxSize = this.options.maxSize ?? valueFromContext(scope, MAX_SIZE_KEY, DEFAULT_NG_MAXSIZE);
        const desiredSize = this.options.desiredSize ?? valueFromContext(scope, DESIRED_SIZE_KEY, minSize);
        const privateCluster = this.options.privateCluster ?? valueFromContext(scope, PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? EndpointAccess.PRIVATE : EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = (privateCluster === true) ? [{ subnetType: SubnetType.PRIVATE }] : this.options.vpcSubnets;

        // Create an EKS Cluster
        const cluster = new Cluster(scope, id, {
            vpc: vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: version,
            vpcSubnets: vpcSubnets,
            endpointAccess: endpointAccess
        });

        // Create a managed node group.
        const nodeGroup = cluster.addNodegroupCapacity(id + "-ng", {
            amiType: this.options.amiType,
            capacityType: this.options.nodeGroupCapacityType,
            instanceTypes: instanceTypes,
            minSize: minSize,
            maxSize: maxSize,
            desiredSize: desiredSize,
            releaseVersion: this.options.amiReleaseVersion
        });

        return { cluster: cluster, nodeGroup: nodeGroup, version: version };
    }
}

/**
 * Validates that cluster is backed by EC2 either through a managed node group or through a self-managed autoscaling group.
 * @param clusterInfo 
 * @param source Used for error message to identify the source of the check
 * @returns 
 */
export function assertEC2NodeGroup(clusterInfo: ClusterInfo, source: string): Nodegroup | AutoScalingGroup {
    console.assert(clusterInfo.nodeGroup || clusterInfo.autoscalingGroup, `${source} is supported with EKS EC2 only`);
    return clusterInfo.nodeGroup || clusterInfo.autoscalingGroup!;
}
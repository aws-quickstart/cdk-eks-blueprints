import { Construct } from "@aws-cdk/core";
import { InstanceType, InstanceClass,  InstanceSize, IVpc, SubnetSelection } from "@aws-cdk/aws-ec2";
import { CapacityType, Cluster, CommonClusterOptions, KubernetesVersion, NodegroupAmiType } from "@aws-cdk/aws-eks";
import { ClusterInfo, ClusterProvider } from "../stacks/eks-blueprint-stack";

/**
 * Default instance type for managed node group provisioning
 */
const DEFAULT_INSTANCE_TYPE = InstanceType.of(InstanceClass.M5, InstanceSize.LARGE);

/**
 * Default min size of MNG
 */
const DEFAULT_NG_MINSIZE = 1;

/**
 * Default max size for MNG
 */
const DEFAULT_NG_MAXSIZE = 3;

/**
 * EC2 provider configuration options.
 */
export interface EC2ProviderClusterProps extends CommonClusterOptions {
    
    /**
     * Instance types used for the node group. Mulitple types makes sense if capacity type is SPOT.
     */
    instanceTypes?: InstanceType[]; // m5.large

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
     * Choose AMI type for the managed node group.
     */
    amiType?: NodegroupAmiType.AL2_X86_64;

    /**
     * Subnets are passed to the cluster configuration.
     */
    vpcSubnets?: SubnetSelection[];

    /**
     * This property is used to upgrade node groups to the latest kubelet by upgrading node group AMI.
     * Look up the versions here (mapped to Kubernetes version): https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html
     */
    amiReleaseVersion?: string;

    /**
     * Select either SPOT or ON-DEMAND
     */
    nodeGroupCapacityType?: CapacityType;
}

/**
 * Looks up default value from context (cdk.json, cdk.context.json and ~/.cdk.json)
 * @param construct 
 * @param key 
 * @param defaultValue 
 * @returns 
 */
function  defaultValue(construct: Construct, key: string, defaultValue : any) {
    return construct.node.tryGetContext(key) ?? defaultValue;
}

/**
 * Base implementation of an EC2 cluster provider with managed node group.
 */
export class EC2ClusterProvider implements ClusterProvider {

    readonly options: EC2ProviderClusterProps;


    constructor(options?: EC2ProviderClusterProps) {
        this.options = options ?? { version: KubernetesVersion.V1_19 };
    }

    createCluster(scope: Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo {

        const id = scope.node.id;

        const defaultInstanceType = defaultValue(scope, "eks.default.instance-type", DEFAULT_INSTANCE_TYPE);
        const instanceTypes = this.options.instanceTypes ?? [ defaultInstanceType ];
        const minSize  = this.options.minSize ?? defaultValue(scope, "eks.default.min-size", DEFAULT_NG_MINSIZE);
        const maxSize = this.options.maxSize ?? defaultValue(scope, "eks.default.max-size", DEFAULT_NG_MAXSIZE);

        const desiredSize = this.options.desiredSize ?? defaultValue(scope, "eks.default.desired-size", minSize);
        
        const cluster = new Cluster(scope, id, {
            vpc: vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: this.options.version,
            vpcSubnets: this.options.vpcSubnets,
        });   

        const nodeGroup = cluster.addNodegroupCapacity(id + "-ng", {
            capacityType: this.options.nodeGroupCapacityType, 
            instanceTypes: instanceTypes,
            amiType: this.options.amiType,
            minSize: minSize,
            maxSize: maxSize,
            desiredSize: desiredSize,
            releaseVersion: this.options.amiReleaseVersion
        });

        return { cluster: cluster, nodeGroup: nodeGroup, version: version };
    }

}
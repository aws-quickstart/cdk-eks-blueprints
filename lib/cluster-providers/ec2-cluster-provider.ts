import { Construct } from "@aws-cdk/core";
import { InstanceType, InstanceClass,  InstanceSize, IVpc, SubnetSelection } from "@aws-cdk/aws-ec2";
import { Cluster, CommonClusterOptions, KubernetesVersion, NodegroupAmiType } from "@aws-cdk/aws-eks";
import { ClusterInfo, ClusterProvider } from "../stacks/eks-blueprint-stack";

const DEFAULT_INSTANCE_TYPE = InstanceType.of(InstanceClass.M5, InstanceSize.LARGE);
const DEFAULT_NG_MINSIZE = 1;
const DEFAULT_NG_MAXSIZE = 3;

export interface EC2ProviderClusterProps extends CommonClusterOptions {
    instanceType?: InstanceType; // m5.large

    minSize?: number;

    maxSize?: number;

    amiType?: NodegroupAmiType.AL2_X86_64;

    vpcSubnets?: SubnetSelection[];
}

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

        const instanceType = this.options.instanceType ?? defaultValue(scope, "eks.default.instance-type", DEFAULT_INSTANCE_TYPE);
        const minSize  = this.options.minSize ?? defaultValue(scope, "eks.default.min-size", DEFAULT_NG_MINSIZE);
        const maxSize = this.options.maxSize ?? defaultValue(scope, "eks.default.max-size", DEFAULT_NG_MAXSIZE);
        
        const cluster = new Cluster(scope, id, {
            vpc: vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: this.options.version,
            vpcSubnets: this.options.vpcSubnets,
        });   

        const nodeGroup = cluster.addNodegroupCapacity(id + "-ng", {
            instanceType: instanceType,
            amiType: this.options.amiType,
            minSize: minSize,
            maxSize: maxSize
        });

        return { cluster: cluster, nodeGroup: nodeGroup, version: version };
    }

}
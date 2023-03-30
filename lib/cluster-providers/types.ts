import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { AutoScalingGroupCapacityOptions } from "aws-cdk-lib/aws-eks";

/**
 * Configuration options for the custom AMI.
 */
export interface LaunchTemplateProps {
    /**
     * The custom AMI for the node group.
     */
    machineImage?: ec2.IMachineImage;

    /**
     * The userData for worker node when using custom AMI. Only applicable when customAmi is used.
     */
    userData?: ec2.UserData;

    /**
     * Custom Tags for launch template which will propogate to worker nodes.
     */
    customTags?: {
        [key: string]: string;
    }

}


export interface ManagedNodeGroup extends Omit<eks.NodegroupOptions, "launchTemplate" | "subnets" | "capacityType" | "releaseVersion"> {

    /**
     * Id of this node group. Expected to be unique in cluster scope.
     */
    id: string, 

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
    instanceTypes?: ec2.InstanceType[];

    /**
     * Choose AMI type for the managed node group.
     */
    amiType?: eks.NodegroupAmiType;

    /**
     * This property is used to upgrade node groups to the latest kubelet by upgrading node group AMI.
     * Look up the versions here (mapped to Kubernetes version): https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html
     */
    amiReleaseVersion?: string;

    /**
     * The Launch Template properties for the Nodes.
     * `amiType` and `amiReleaseVersion` will be ignored if this is set.
     */
    launchTemplate?: LaunchTemplateProps;

    /**
     * Select either SPOT or ON-DEMAND
     */
    nodeGroupCapacityType?: eks.CapacityType;

    /**
     * Subnets for the autoscaling group where nodes (instances) will be placed.
     * @default all private subnets
     */
    nodeGroupSubnets?: ec2.SubnetSelection;

    /**
     * If set to true will add AmazonSSMManagedInstanceCore to the node role.
     */
    enableSsmPermissions?: boolean;
}

/**
 * A node groups for EKS that leverage EC2 Autoscaling Groups.
 * Also referred to as "self-managed" node group, implying that maintenance of the group
 * is performed by the customer (as opposed to AWS as in case of a ManagedNodeGroup).
 */
export interface AutoscalingNodeGroup extends Omit<AutoScalingGroupCapacityOptions, "minCapacity" | "maxCapacity" | "desiredCapacity" | "instanceType" | "vpcSubnets"> {

    /**
     * Id of this node group. Expected to be unique in cluster scope.
     */
    id: string, 

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
     * Instance type of the instances to start. If not specified defaults are applied in the following order:
     * - 'eks.default.instance-type' in CDK context (e.g. ~/.cdk.json under "context" key))
     * - M5.Large
     */
    instanceType?: ec2.InstanceType;

    /**
     * Subnets for the autoscaling group where nodes (instances) will be placed.
     * @default all private subnets
     */
    nodeGroupSubnets?: ec2.SubnetSelection;

}

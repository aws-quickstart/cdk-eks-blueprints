import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";

/**
 * Configuration options for the custom AMI.
 */
export interface CustomAmiProps {
    /**
     * The custom AMI for the node group.
     */
    machineImage?: ec2.IMachineImage;

    /**
     * The userData for worker node when using custom AMI. Only applicable when customAmi is used.
     */
    userData?: ec2.UserData;
}


export interface ManagedNodeGroup {

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
     * The custom AMI for the node group. `amiType` and `amiReleaseVersion` will be ignored if this is set.
     */
    customAmi?: CustomAmiProps;

    /**
     * Select either SPOT or ON-DEMAND
     */
    nodeGroupCapacityType?: eks.CapacityType;

    /**
     * Subnets are passed to the cluster configuration.
     */
    vpcSubnets?: ec2.SubnetSelection[];
}

/**
 * A node groups for EKS that leverage EC2 Autoscaling Groups.
 * Also referred to as "self-managed" node group, implying that maintenance of the group
 * is performed by the customer (as oppposed to AWS as in case of a ManagedNodeGroup).
 */
export interface AutoscalingNodeGroup {

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
     * Instance types used for the node group.
     * @default m5.large
     */
    instanceType?: ec2.InstanceType;

    /**
     * Machine Image Type for the Autoscaling Group.
     * @default eks.MachineImageType.AMAZON_LINUX_2
     */
    machineImageType?: eks.MachineImageType;

    /**
     * Update policy for the Autoscaling Group.
     */
    updatePolicy?: UpdatePolicy;

    /**
     * Subnets are passed to the cluster configuration.
     */
    vpcSubnets?: ec2.SubnetSelection[];

}

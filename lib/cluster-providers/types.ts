import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import { UpdatePolicy } from "@aws-cdk/aws-autoscaling";

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
    amiType?: eks.NodegroupAmiType.AL2_X86_64;

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

export interface SelfManagedNodeGroup {

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

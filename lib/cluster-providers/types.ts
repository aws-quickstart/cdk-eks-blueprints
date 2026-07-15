import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks-v2";
import { AutoScalingGroupCapacityOptions } from "aws-cdk-lib/aws-eks-v2";
import { NodePoolV1Spec } from "../addons";
import { IRole } from "aws-cdk-lib/aws-iam";

/**
 * Configuration options for the custom AMI.
 */
export interface LaunchTemplateProps {
    /**
     * Specifies how block devices are exposed to the instance
     */
    blockDevices?: ec2.BlockDevice[];
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
    tags?: {
        [key: string]: string;
    }

    /**
     * Whether IMDSv2 should be required on launched instances. (optional, default: false)
     */
    requireImdsv2?: boolean;

    /**
     * Security group to assign to instances created with the launch template.
     */
    securityGroup?: ec2.ISecurityGroup;

    /**
     * The desired HTTP PUT response hop limit for instance metadata requests. The larger the number, the further instance metadata requests can travel.
     *
     * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-launchtemplatedata-metadataoptions.html#cfn-ec2-launchtemplate-launchtemplatedata-metadataoptions-httpputresponsehoplimit
     *
     * @default 1
     */
    readonly httpPutResponseHopLimit?: number;
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

export type AutoModeNodeClassSpec = {
  /*
   * Name of IAM role for EC2 instances if you don't want to use the auto generated Auto Mode role
   * Mutually exclusive with instanceProfile
   */
  role?: IRole;

  /*
   * Name of pre-provisioned IAM instance profile to use instead of IAM role
   * Mutually exclusive with role
   */
  instanceProfile?: string;

  /*
   * Subnet selector terms (subnet id or tags)
   * Required
   */
  subnetSelectorTerms?: Array<{
    tags?: Record<string, string>;
    id?: string;
  }>;

  /*
   * Security Group selector terms (security group id, tags or names)
   * Required
   */
  securityGroupSelectorTerms?: Array<{
    tags?: Record<string, string>;
    id?: string;
    name?: string;
  }>;

  /*
   * Pod subnet selector for advanced networking
   * See https://docs.aws.amazon.com/eks/latest/userguide/create-node-class.html#pod-subnet-selector
   */
  podSubnetSelectorTerms?: Array<{
    tags?: Record<string, string>;
    id?: string;
  }>;

  /*
   * Pod security group selector for advanced networking
   * Required if using pod subnet selector
   */
  podSecurityGroupSelectorTerms?: Array<{
    tags?: Record<string, string>;
    id?: string;
  }>;

  /*
   * Selects on-demand capacity reservations and capacity blocks for EKS Auto Mode to prioritieze
   */
  capacityReservationSelectorTerms?: Array<{
    id?: string;
    tags?: Record<string, string>;
    owner?: string;
  }>;


  /*
   * Source Network Address Translation for pods.
   */
  snatPolicy?: "Random" | "Disabled";

  /*
   * Default network access policy for pods on these nodes
   */
  networkPolicy?: "DefaultAllow" | "DefaultDeny";

  /*
   * Whether to log network policy enforcement events to CloudWatch
   */
  networkPolicyEventLogs?: "Disabled" | "Enabled";

  /*
   * Temporary storage configuration for node
   */
  ephemeralStorage?: {
    size?: string; // Range: 1-59000Gi or 1-64000G or 1-58Ti or 1-64T
    iops?: number; // Range: 3000-16000
    throughput?: number; // Range: 125-1000
    kmsKeyID?: string; // optional kms key for encryption, can be ID, ARN, Alias Name, or Alias ARN
  };

  advancedNetworking?: {
    /*
     * Controls whether public IP addresses are assigned to instances that are launched with the nodeclass
     * If not set, defaults to MapPublicIpOnLaunch setting on the subnet
     */
    associatePublicIPAddress?: boolean;

    /*
     * Forward proxy, commonly requires certificateBundles as well. See https://repost.aws/knowledge-center/eks-http-proxy-containerd-automation
     * commonly uses port 3128 or 8080
     */
    httpsProxy?: string;

    noProxy?: string[]; // Max 50 entries
  };

  advancedSecurity?: {
    /*
     * For US regions only.  If true, nodes will run on FIPS compatible AMIs.
     */
    fips?: boolean;
  };

  /*
   * Custom certificate bundles
   */
  certificateBundles?: Array<{
    name: string;
    data: string;
  }>;

  /*
   * Additional EC2 tags (cannot be restricted tags)
   */
  tags?: Record<string, string>;
};

export type AutoModeNodePoolSpec = NodePoolV1Spec & { nodeClassName?: string; }


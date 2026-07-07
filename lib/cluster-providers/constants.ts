import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";

/**
 * Default instance type for managed node group provisioning
 */
export const DEFAULT_INSTANCE_TYPE = ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE);

/**
 * Default AMI for Managed Node Group Provisioning
 */
export const DEFAULT_AMI = eks.NodegroupAmiType.AL2023_X86_64_STANDARD;

/**
 * Default min size of MNG. Defaults to 2 so that HA workloads that require
 * spreading across nodes (e.g. Karpenter's 2 controller replicas with hostname
 * topology spread) can schedule out of the box. desiredSize defaults to minSize.
 */
export const DEFAULT_NG_MINSIZE = 2;

/**
 * Default max size for MNG
 */
export const DEFAULT_NG_MAXSIZE = 3;

/**
 * Keys for context lookups.
 */
export const INSTANCE_TYPE_KEY = "eks.default.instance-type";

export const MIN_SIZE_KEY = "eks.default.min-size";

export const MAX_SIZE_KEY = "eks.default.max-size";

export const DESIRED_SIZE_KEY = "eks.default.desired-size";

export const PRIVATE_CLUSTER = "eks.default.private-cluster";

export const ISOLATED_CLUSTER = "eks.default.isolated-cluster";

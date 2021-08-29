import * as ec2 from "@aws-cdk/aws-ec2";

/**
 * Default instance type for managed node group provisioning
 */
export const DEFAULT_INSTANCE_TYPE = ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE);

/**
 * Default min size of MNG
 */
export const DEFAULT_NG_MINSIZE = 1;

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
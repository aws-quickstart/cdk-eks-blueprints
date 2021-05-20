# EC2 Cluster Provider

## Stack Configuration

Supports context variables (specify in cdk.json, cdk.context.json or pass with -c command line option):

- `instanceType`: (defaulted to "t3.medium") Type of instance for the EKS cluster, must be a valid instance type like t3.medium
- `vpc`: Specifies whether to use an existing VPC (if specified) or create a new one if not specified.
- `minSize`: Min cluster size, must be positive integer greater than 0 (default 1).
- `maxSize`: Max cluster size, must be greater than minSize.
- `vpcSubnets`: List of VPC subnets for cluster provisioning (unsupported yet)


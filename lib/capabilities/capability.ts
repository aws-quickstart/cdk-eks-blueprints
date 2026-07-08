import { CfnCapability, CfnCapabilityProps, IAccessPolicy } from "aws-cdk-lib/aws-eks";
import { ClusterInfo, ClusterCapability, CapabilityType, AssociateAccessPolicy } from "../spi";
import { CfnTag } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";


// REQUIRES API or API_AND_CONFIGMAP

/**
 * Configuration properties for EKS capabilities
 */
export interface CapabilityProps {
  /** Custom name for the capability. Defaults to capability type if not provided */
  capabilityName?: string;
  /** Existing IAM role ARN to use. If not provided, a new role will be created */
  roleArn?: string;
  /** Name of custom managed policy to attach (used in place of default policy) */
  policyName?: string;
  /** Custom inline policy document (used in place of default policy) */
  policyDocument?: iam.PolicyDocument;
  /** Additional EKS access policies to associate with the capability ClusterRole*/
  additionalAccessPolicies?: IAccessPolicy[];
  /** CloudFormation tags to apply */
  tags?: CfnTag[];
  /** The type of capability being created */
  type: CapabilityType;
}

/**
 * Base class for EKS capabilities that provides common functionality for creating
 * and configuring EKS capabilities with proper IAM roles and policies.
 * 
 * This class handles the CDK v2.224.0+ compatibility by ensuring managed policies
 * are created within proper construct scope to avoid UnscopedValidationError.
 */
export class Capability implements ClusterCapability {
  /** 
   * Default AWS managed policy name for this capability type.
   * Set to undefined in base class for security - subclasses should override.
   */
  readonly DEFAULT_POLICY_NAME: string | undefined = undefined;
  readonly type: CapabilityType;

  /**
   * Creates a new capability instance with validation
   * @param props Configuration properties for the capability
   * @throws Error when useDefaultPolicy is false but no alternative policy is provided
   */
  constructor(readonly props: CapabilityProps) {
    this.type = props.type;
  }

  /**
   * Creates the EKS capability CloudFormation resource
   * @param clusterInfo Information about the target EKS cluster
   * @returns The created CfnCapability resource
   */
  create(clusterInfo: ClusterInfo): CfnCapability {

    const capabilityProps: CfnCapabilityProps = {
      capabilityName: this.props.capabilityName || this.props.type,
      clusterName: clusterInfo.cluster.clusterName,
      roleArn: this.props.roleArn || this.setupRole(clusterInfo, this.props.type, this.props.policyName, this.props.policyDocument),
      type: this.props.type.toUpperCase(),
      deletePropagationPolicy: "RETAIN",
      tags: this.props.tags
    };
    const capability = new CfnCapability(clusterInfo.cluster.stack, capabilityProps.capabilityName, capabilityProps);
    capability.node.addDependency(clusterInfo.cluster);

    if (this.props.additionalAccessPolicies?.length) {
      const associateAccessPolicy = new AssociateAccessPolicy(clusterInfo.cluster.stack, capabilityProps.capabilityName + "-access-policies", {
        clusterName: capabilityProps.clusterName,
        roleArn: capabilityProps.roleArn,
        accessPolicies: this.props.additionalAccessPolicies
      });
      associateAccessPolicy.node.addDependency(capability);
    }
    return capability;
  }

  /**
   * Sets up IAM role for the capability with appropriate policies.
   * Creates managed policy references within stack context to avoid CDK v2.224.0+ issues.
   * 
   * @param clusterInfo Information about the target EKS cluster
   * @param capabilityType Type of capability being created
   * @param policyName Optional custom managed policy name
   * @param policyDocument Optional inline policy document
   * @returns ARN of the created or configured IAM role
   */
  setupRole(clusterInfo: ClusterInfo, capabilityType: CapabilityType, policyName?: string, policyDocument?: iam.PolicyDocument): string {
    const role = new iam.Role(clusterInfo.cluster.stack, capabilityType.toString() + "-role", {
      assumedBy: new iam.ServicePrincipal("capabilities.eks.amazonaws.com").withSessionTags(),
    });

    // Policy attachment priority: default managed > custom managed > inline
    if (policyName) {
      role.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyName(clusterInfo.cluster.stack, policyName + "-cap-pol", policyName));
    } else if (policyDocument) {
      role.attachInlinePolicy(new iam.Policy(clusterInfo.cluster.stack, capabilityType.toString() + "-cap-pol", { document: policyDocument }));
    } else if (this.DEFAULT_POLICY_NAME) {
      role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(this.DEFAULT_POLICY_NAME));
    }

    return role.roleArn;
  }

}

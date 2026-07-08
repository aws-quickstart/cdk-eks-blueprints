import { CapabilityProps, Capability } from "./capability";
import * as cdk from "aws-cdk-lib";
import { CapabilityType, ClusterInfo } from "../spi";
import { CfnCapability } from "aws-cdk-lib/aws-eks";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Scopes an IAMRoleSelector to specific Kubernetes resource types.
 */
export interface AckResourceTypeSelector {
  group: string;
  version: string;
  kind: string;
}

/**
 * Properties for ACK capability.
 */
export interface AckCapabilityProps extends Omit<CapabilityProps, "type"> {
  /** IAM Role Selectors for granular permission control */
  roleSelectors?: AckRoleSelectorBuilder[];
}

/**
 * Builder for constructing ACK IAMRoleSelector resources.
 * Accepts either an existing role ARN or a policy to create a new role.
 *
 * @example
 * ```typescript
 * // Let the capability create the role with a managed policy
 * new AckRoleSelectorBuilder("s3-prod")
 *   .withManagedPolicy("AmazonS3FullAccess")
 *   .namespaces("production")
 *   .build()
 *
 * // Use an existing role ARN
 * new AckRoleSelectorBuilder("rds-prod")
 *   .withRoleArn("arn:aws:iam::123:role/MyExistingRole")
 *   .namespaces("rds-resources")
 *   .build()
 *
 * // Use a custom inline policy
 * new AckRoleSelectorBuilder("s3-readonly")
 *   .withPolicyDocument(new iam.PolicyDocument({
 *     statements: [new iam.PolicyStatement({
 *       actions: ["s3:Get*", "s3:List*"],
 *       resources: ["*"],
 *     })],
 *   }))
 *   .namespaces("s3-readonly")
 *   .build()
 * ```
 */
export class AckRoleSelectorBuilder {
  readonly name: string;
  roleArn?: string;
  managedPolicyName?: string;
  policyDocument?: iam.PolicyDocument;
  namespaceNames?: string[];
  namespaceLabelSelector?: Record<string, string>;
  resourceTypeSelector?: AckResourceTypeSelector[];

  constructor(name: string) {
    this.name = name;
  }

  /** Use an existing IAM role ARN */
  withRoleArn(roleArn: string): this {
    this.roleArn = roleArn;
    return this;
  }

  /** Create a role with an AWS managed policy */
  withManagedPolicy(policyName: string): this {
    this.managedPolicyName = policyName;
    return this;
  }

  /** Create a role with a custom inline policy */
  withPolicyDocument(doc: iam.PolicyDocument): this {
    this.policyDocument = doc;
    return this;
  }

  /** Scope to specific namespace names */
  namespaces(...namespaces: string[]): this {
    this.namespaceNames = namespaces;
    return this;
  }

  /** Scope to namespaces matching labels */
  namespaceLabels(labels: Record<string, string>): this {
    this.namespaceLabelSelector = labels;
    return this;
  }

  /** Scope to specific resource types */
  resourceTypes(...types: AckResourceTypeSelector[]): this {
    this.resourceTypeSelector = types;
    return this;
  }
}

/**
 * AWS Controllers for Kubernetes (ACK) capability for EKS clusters.
 * Requires either direct IAM permissions or roleSelectors to be provided.
 */
export class AckCapability extends Capability {
  readonly DEFAULT_POLICY_NAME = undefined;

  static readonly defaultProps: Partial<AckCapabilityProps> = {
    capabilityName: "blueprints-ack-capability"
  };

  constructor(readonly options: AckCapabilityProps) {
    super({ ...AckCapability.defaultProps, ...options, type: CapabilityType.ACK });
    if (!options.roleArn && !options.policyName && !options.policyDocument && !options.roleSelectors?.length) {
      throw new Error("AckCapability requires one of: roleArn, policyName, policyDocument, or roleSelectors.");
    }
  }

  create(clusterInfo: ClusterInfo): CfnCapability {
    const stack = clusterInfo.cluster.stack;
    const selectors = this.options.roleSelectors;

    if (selectors?.length) {
      const assumeStatement = new iam.PolicyStatement({
        actions: ["sts:AssumeRole", "sts:TagSession"],
        resources: selectors.filter(s => s.roleArn).map(s => s.roleArn!),
      });

      this.props.policyDocument = new iam.PolicyDocument({ statements: [assumeStatement] });

      const capability = super.create(clusterInfo);
      const capabilityRoleArn = capability.roleArn;

      for (const selector of selectors) {
        const manifest = this.buildSelector(stack, capabilityRoleArn, selector);
        // Add newly created role ARNs to the assume-role policy
        if (!selector.roleArn) {
          assumeStatement.addResources(manifest.spec.arn);
        }
        const roleSelectorManifest = new eks.KubernetesManifest(stack, `ack-role-selector-${selector.name}`, {
          cluster: clusterInfo.cluster,
          manifest: [manifest],
        });
        roleSelectorManifest.node.addDependency(capability);
      }

      return capability;
    }

    return super.create(clusterInfo);
  }

  private buildSelector(stack: cdk.Stack, capabilityRoleArn: string, s: AckRoleSelectorBuilder): Record<string, any> {
    if (!s.roleArn && !s.managedPolicyName && !s.policyDocument) {
      throw new Error(`AckRoleSelectorBuilder "${s.name}" requires one of: withRoleArn(), withManagedPolicy(), or withPolicyDocument().`);
    }

    const roleArn = s.roleArn ?? this.createSelectorRole(stack, capabilityRoleArn, s);
    const hasNsSelector = s.namespaceNames || s.namespaceLabelSelector;

    return {
      apiVersion: "services.k8s.aws/v1alpha1",
      kind: "IAMRoleSelector",
      metadata: { name: s.name },
      spec: {
        arn: roleArn,
        ...(hasNsSelector && {
          namespaceSelector: {
            ...(s.namespaceNames && { names: s.namespaceNames }),
            ...(s.namespaceLabelSelector && { labelSelector: { matchLabels: s.namespaceLabelSelector } }),
          },
        }),
        ...(s.resourceTypeSelector?.length && { resourceTypeSelector: s.resourceTypeSelector }),
      },
    };
  }

  private createSelectorRole(stack: cdk.Stack, capabilityRoleArn: string, s: AckRoleSelectorBuilder): string {
    const role = new iam.Role(stack, `ack-selector-role-${s.name}`, {
      assumedBy: new iam.ArnPrincipal(capabilityRoleArn).withSessionTags(),
    });

    if (s.managedPolicyName) {
      role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName(s.managedPolicyName));
    } else if (s.policyDocument) {
      role.attachInlinePolicy(new iam.Policy(stack, `ack-selector-policy-${s.name}`, { document: s.policyDocument }));
    }

    return role.roleArn;
  }
}

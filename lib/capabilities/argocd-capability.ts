import { Capability, CapabilityProps } from "./capability";
import { ArgoCDSsoRole, CapabilityType, ClusterInfo, SsoIdentityType } from "../spi";
import { CfnCapability } from "aws-cdk-lib/aws-eks";
import * as eks from "aws-cdk-lib/aws-eks";
import { IVpcEndpoint } from "aws-cdk-lib/aws-ec2";
import { CfnOutput } from "aws-cdk-lib";

/**
 * Simplified role mappings for ArgoCD capability.
 * Map SSO users and groups to ArgoCD roles without needing to import enums.
 */
export interface ArgoRoleMappings {
  adminUsers?: string[];
  adminGroups?: string[];
  editorUsers?: string[];
  editorGroups?: string[];
  viewerUsers?: string[];
  viewerGroups?: string[];
}

/**
 * Properties for ArgoCD capability configuration.
 */
export interface ArgoCapabilityProps extends Omit<CapabilityProps, "type"> {
  /** AWS Identity Center Instance ARN for ArgoCD integration */
  idcInstanceArn: string;
  /** IDC managed application ARN */
  idcManagedApplicationArn?: string;
  /** IDC region */
  idcRegion?: string;
  /** ArgoCD server URL */
  serverUrl?: string;
  /** Kubernetes namespace for ArgoCD */
  namespace?: string;
  /** VPC endpoints for network access */
  networkAccessVpcEndpoints?: IVpcEndpoint[];
  /** Simplified role mappings for SSO users and groups */
  roleMappings?: ArgoRoleMappings;
  /** Register the local cluster as an ArgoCD target */
  registerLocalCluster?: boolean;
}

/**
 * ArgoCD capability for EKS clusters.
 * Enables GitOps workflows and continuous deployment through ArgoCD integration.
 * Requires AWS Identity Center for authentication and uses Secrets Manager for credential access.
 *
 * @example
 * ```typescript
 * // Using props
 * new ArgoCapability({
 *   idcInstanceArn: "arn:aws:sso:::instance/ssoins-123",
 *   roleMappings: { adminUsers: ["user-id-123"], viewerGroups: ["group-id-456"] },
 * });
 *
 * // Using builder methods
 * new ArgoCapability({ idcInstanceArn: "arn:aws:sso:::instance/ssoins-123" })
 *   .addAdmin("user-id-123", SsoIdentityType.SSO_USER)
 *   .addViewer("group-id-456", SsoIdentityType.SSO_GROUP);
 * ```
 */
export class ArgoCapability extends Capability {
  readonly DEFAULT_POLICY_NAME = "AWSSecretsManagerClientReadOnlyAccess";

  static readonly defaultProps: Partial<ArgoCapabilityProps> = {
    capabilityName: "blueprints-argocd-capability",
    namespace: "argocd",
    registerLocalCluster: true
  };

  private readonly internalMappings: { role: ArgoCDSsoRole; identityId: string; identityType: SsoIdentityType }[] = [];

  constructor(readonly options: ArgoCapabilityProps) {
    const merged = { ...ArgoCapability.defaultProps, ...options };
    super({ ...merged, type: CapabilityType.ARGOCD });
    this.options = merged as ArgoCapabilityProps;
  }

  /** Add an ADMIN identity */
  addAdmin(identityId: string, identityType: SsoIdentityType): this {
    this.internalMappings.push({ role: ArgoCDSsoRole.ADMIN, identityId, identityType });
    return this;
  }

  /** Add an EDITOR identity */
  addEditor(identityId: string, identityType: SsoIdentityType): this {
    this.internalMappings.push({ role: ArgoCDSsoRole.EDITOR, identityId, identityType });
    return this;
  }

  /** Add a VIEWER identity */
  addViewer(identityId: string, identityType: SsoIdentityType): this {
    this.internalMappings.push({ role: ArgoCDSsoRole.VIEWER, identityId, identityType });
    return this;
  }

  create(clusterInfo: ClusterInfo): CfnCapability {
    const capability = super.create(clusterInfo);
    const roleMappings = this.buildRoleMappings();

    capability.configuration = {
      argoCd: {
        awsIdc: {
          idcInstanceArn: this.options.idcInstanceArn,
          ...(this.options.idcManagedApplicationArn && { idcManagedApplicationArn: this.options.idcManagedApplicationArn }),
          ...(this.options.idcRegion && { idcRegion: this.options.idcRegion }),
        },
        ...(this.options.namespace && { namespace: this.options.namespace }),
        ...(this.options.networkAccessVpcEndpoints?.length && {
          networkAccess: { vpceIds: this.options.networkAccessVpcEndpoints.map(e => e.vpcEndpointId) },
        }),
        ...(roleMappings.length && { rbacRoleMappings: roleMappings }),
        ...(this.options.serverUrl && { serverUrl: this.options.serverUrl }),
      }
    };

    new CfnOutput(clusterInfo.cluster, "ArgoCDCapabilityAccessURL", { value: capability.attrConfigurationArgoCdServerUrl });

    if (this.options.registerLocalCluster) {
      const ns = this.options.namespace!;
      const manifest = new eks.KubernetesManifest(clusterInfo.cluster.stack, "argocd-local-cluster-secret", {
        cluster: clusterInfo.cluster,
        manifest: [{
          apiVersion: "v1",
          kind: "Secret",
          metadata: {
            name: "local-cluster",
            namespace: ns,
            labels: {
              "argocd.argoproj.io/secret-type": "cluster",
            },
          },
          stringData: {
            name: "local-cluster",
            server: clusterInfo.cluster.clusterArn,
            project: "default",
          },
        }],
      });
      manifest.node.addDependency(capability);
    }

    return capability;
  }

  /**
   * Merges props-based roleMappings and builder-based internalMappings
   * into the CFN rbacRoleMappings format.
   */
  private buildRoleMappings(): { role: string; identities: { id: string; type: string }[] }[] {
    const merged = new Map<string, { id: string; type: string }[]>();

    // From simplified props
    const m = this.options.roleMappings;
    if (m) {
      const entries: [ArgoCDSsoRole, string[] | undefined, SsoIdentityType][] = [
        [ArgoCDSsoRole.ADMIN, m.adminUsers, SsoIdentityType.SSO_USER],
        [ArgoCDSsoRole.ADMIN, m.adminGroups, SsoIdentityType.SSO_GROUP],
        [ArgoCDSsoRole.EDITOR, m.editorUsers, SsoIdentityType.SSO_USER],
        [ArgoCDSsoRole.EDITOR, m.editorGroups, SsoIdentityType.SSO_GROUP],
        [ArgoCDSsoRole.VIEWER, m.viewerUsers, SsoIdentityType.SSO_USER],
        [ArgoCDSsoRole.VIEWER, m.viewerGroups, SsoIdentityType.SSO_GROUP],
      ];
      for (const [role, ids, type] of entries) {
        if (ids?.length) {
          const list = merged.get(role) ?? [];
          ids.forEach(id => list.push({ id, type }));
          merged.set(role, list);
        }
      }
    }

    // From builder methods
    for (const { role, identityId, identityType } of this.internalMappings) {
      const list = merged.get(role) ?? [];
      list.push({ id: identityId, type: identityType });
      merged.set(role, list);
    }

    return Array.from(merged.entries()).map(([role, identities]) => ({ role, identities }));
  }
}

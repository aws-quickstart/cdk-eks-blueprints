# ArgoCD Capability

The [ArgoCD capability](https://docs.aws.amazon.com/eks/latest/userguide/capabilities.html) enables GitOps-based continuous deployment, automatically syncing application resources to clusters from Git repositories. It integrates with AWS Identity Center for authentication and authorization.

This is the AWS-managed alternative to the self-managed [ArgoCDAddOn](../addons/argo-cd.md). Using both on the same cluster will result in a conflict error.

## Usage

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';

const stack = blueprints.EksBlueprint.builder()
  .version("auto")
  .capabilities({
    argocd: new blueprints.capabilities.ArgoCapability({
      idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
    }),
  })
  .build(app, 'my-cluster');
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `idcInstanceArn` | `string` | **Required** | AWS Identity Center instance ARN |
| `idcManagedApplicationArn` | `string` | - | IDC managed application ARN |
| `idcRegion` | `string` | - | IDC region |
| `capabilityName` | `string` | `blueprints-argocd-capability` | Name for the capability resource |
| `namespace` | `string` | `argocd` | Kubernetes namespace for ArgoCD |
| `serverUrl` | `string` | - | ArgoCD server URL |
| `networkAccessVpcEndpoints` | `IVpcEndpoint[]` | - | VPC endpoints for network access |
| `roleMappings` | `ArgoRoleMappings` | - | SSO role-to-identity mappings |
| `registerLocalCluster` | `boolean` | `true` | Register the local cluster as an ArgoCD deployment target |
| `additionalAccessPolicies` | `IAccessPolicy[]` | - | Additional EKS access policies to associate with the capability role (see [Additional Access Policies](#additional-access-policies)) |
| `roleArn` | `string` | Auto-created | Existing IAM role ARN |
| `tags` | `CfnTag[]` | - | CloudFormation tags |

The default IAM policy is `AWSSecretsManagerClientReadOnlyAccess`.

## Role Mappings

Map AWS Identity Center users or groups to ArgoCD RBAC roles. Two approaches:

**Simplified props:**
```typescript
new blueprints.capabilities.ArgoCapability({
  idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
  roleMappings: {
    adminUsers: ["<sso-user-id>"],
    viewerGroups: ["<sso-group-id>"],
    editorUsers: ["<sso-user-id>"],
  },
})
```

**Builder methods:**
```typescript
new blueprints.capabilities.ArgoCapability({
  idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
})
.addAdmin("<sso-user-id>", blueprints.SsoIdentityType.SSO_USER)
.addViewer("<sso-group-id>", blueprints.SsoIdentityType.SSO_GROUP)
.addEditor("<sso-user-id>", blueprints.SsoIdentityType.SSO_USER)
```

Both approaches can be combined — mappings are merged at deploy time.

## Local Cluster Registration

To deploy applications to the same cluster where ArgoCD is running, set `registerLocalCluster: true` (default). This creates a Kubernetes Secret that registers the cluster as an ArgoCD deployment target:

```typescript
new blueprints.capabilities.ArgoCapability({
  idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
  registerLocalCluster: true,
})
```

## Additional Access Policies

The built-in ArgoCD policies (`AmazonEKSArgoCDClusterPolicy` and `AmazonEKSArgoCDPolicy`) only grant permission to manage ArgoCD's own objects — Applications, AppProjects, secrets in the argocd namespace, and CRD installation. They do **not** cover the workload resources that ArgoCD syncs (Deployments, Services, CRDs, ACK resources, etc.). Without additional permissions, Application syncs will fail with RBAC errors.

For most ArgoCD deployments, you need `AmazonEKSClusterAdminPolicy` at cluster scope:

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

new blueprints.capabilities.ArgoCapability({
  idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
  additionalAccessPolicies: [
    eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {
      accessScopeType: eks.AccessScopeType.CLUSTER,
    }),
  ],
})
```

This is especially necessary when ArgoCD deploys ACK custom resources (e.g., `s3.services.k8s.aws/Bucket`) or KRO ResourceGroupDefinitions, as those are cluster-scoped or belong to non-standard API groups.

See [Additional Access Policies](index.md#additional-access-policies) for the full list of available policies and when to use each one.

## Accessing the ArgoCD UI

After deploying the capability, the ArgoCD access URL is available as a CloudFormation output named `ArgoCDCapabilityAccessURL`. Retrieve it with:

```bash
aws cloudformation describe-stacks --stack-name <stack-name> \
  --query "Stacks[0].Outputs[?contains(OutputKey,'ArgoCDCapabilityAccessURL')].OutputValue" \
  --output text
```

Open the URL in your browser and sign in with your AWS Identity Center credentials. Access is governed by the role mappings configured above.

Available roles: `ADMIN`, `EDITOR`, `VIEWER`.

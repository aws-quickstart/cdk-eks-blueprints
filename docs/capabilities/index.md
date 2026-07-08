# EKS Capabilities

[EKS Capabilities](https://docs.aws.amazon.com/eks/latest/userguide/capabilities.html) are fully managed cluster features that eliminate the need to install, maintain, and scale foundational cluster services. Each capability is an AWS resource that runs in EKS and is managed by AWS.

Available capabilities:

- **[ACK](ack-capability.md)** — Manage AWS resources using Kubernetes APIs
- **[ArgoCD](argocd-capability.md)** — GitOps-based continuous deployment with AWS Identity Center integration
- **[kro](kro-capability.md)** — Create custom Kubernetes APIs that compose multiple resources into higher-level abstractions

## Capabilities vs Addons

Capabilities are the AWS-managed equivalent of self-managed addons. They differ in that AWS handles installation, upgrades, scaling, and security patching. The blueprints framework automatically detects conflicts — if you add both a capability and its corresponding addon (e.g. `AckCapability` and `AckAddOn`), the build will fail with a conflict error.

## Prerequisites

EKS Capabilities require the cluster authentication mode to be set to `API` or `API_AND_CONFIG_MAP`. The legacy `CONFIG_MAP` mode is not supported. If using `GenericClusterProvider`, set this explicitly:

```typescript
import { AuthenticationMode } from 'aws-cdk-lib/aws-eks';

const clusterProvider = new blueprints.GenericClusterProvider({
  authenticationMode: AuthenticationMode.API_AND_CONFIG_MAP,
});
```

## Usage

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';

const stack = blueprints.EksBlueprint.builder()
  .version("auto")
  .capabilities({
    ack: new blueprints.capabilities.AckCapability(),
    kro: new blueprints.capabilities.KroCapability(),
  })
  .build(app, 'my-cluster');
```

Each capability key (`ack`, `argocd`, `kro`) can only appear once — the type system enforces this at compile time.

## IAM Roles

Each capability requires an IAM role with the `capabilities.eks.amazonaws.com` service principal. By default, the framework creates a role with the capability's default managed policy. You can customize this:

```typescript
// Use a custom existing role
new blueprints.capabilities.AckCapability({
  roleArn: "arn:aws:iam::123456789:role/my-custom-role",
})

// Use a custom managed policy
new blueprints.capabilities.AckCapability({
  policyName: "MyCustomAckPolicy",
})

// Use an inline policy document
new blueprints.capabilities.AckCapability({
  policyDocument: new iam.PolicyDocument({ ... }),
})
```

## Additional Access Policies

When EKS creates a capability, it automatically provisions an access entry for the capability's IAM role and associates the capability's built-in access policies. These built-in policies grant the capability permission to manage its own resources (e.g., ArgoCD can manage Applications, ACK can manage its CRDs), but they may not cover everything needed for real-world use. For details on when additional permissions are needed, see [Additional Kubernetes permissions for capabilities](https://docs.aws.amazon.com/eks/latest/userguide/capabilities-security.html#additional-kubernetes-permissions).

Use `additionalAccessPolicies` on any capability to associate extra [EKS access policies](https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html) to the capability's role. This is a base-class feature available to all capabilities.

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

### How it works

EKS auto-creates an access entry for the capability role during capability provisioning. Since CloudFormation cannot create a second access entry for the same principal, the framework uses an `AwsCustomResource` to call the EKS `AssociateAccessPolicy` API (and `DisassociateAccessPolicy` on stack deletion) against the existing entry.

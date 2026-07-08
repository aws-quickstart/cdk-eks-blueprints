# ACK Capability

The [ACK capability](https://docs.aws.amazon.com/eks/latest/userguide/ack.html) enables management of AWS resources using Kubernetes APIs. It continuously reconciles the desired state with the actual state in AWS, correcting any drift. ACK supports cross-account and cross-region resource management.

This is the AWS-managed alternative to the self-managed [AckAddOn](../addons/ack-addon.md). Using both on the same cluster will result in a conflict error.

## Usage

One of `roleArn`, `policyName`, `policyDocument`, or `roleSelectors` must be provided — no default policy is applied.

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';

const stack = blueprints.EksBlueprint.builder()
  .version("auto")
  .capabilities({
    ack: new blueprints.capabilities.AckCapability({
      policyName: "AmazonS3FullAccess",
    }),
  })
  .build(app, 'my-cluster');
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capabilityName` | `string` | `blueprints-ack-capability` | Name for the capability resource |
| `roleArn` | `string` | Auto-created | Existing IAM role ARN to use |
| `policyName` | `string` | - | AWS managed policy name for the capability role |
| `policyDocument` | `iam.PolicyDocument` | - | Custom inline policy for the capability role |
| `roleSelectors` | `AckRoleSelectorBuilder[]` | - | IAM Role Selectors for namespace-level isolation |
| `additionalAccessPolicies` | `IAccessPolicy[]` | - | Additional EKS access policies to associate with the capability role (see [Additional Access Policies](#additional-access-policies)) |
| `tags` | `CfnTag[]` | - | CloudFormation tags |

## IAM Role Selectors

For production environments, use [IAM Role Selectors](https://docs.aws.amazon.com/eks/latest/userguide/ack-permissions.html) to implement least-privilege access and namespace-level isolation. The capability role only needs `sts:AssumeRole` permissions — service-specific permissions are granted to individual roles that the capability role assumes.

Use `AckRoleSelectorBuilder` to configure selectors. The capability automatically:

- Creates the target IAM role with the correct trust policy (when using `withManagedPolicy` or `withPolicyDocument`)
- Adds `sts:AssumeRole` permissions to the capability role for each target role
- Deploys `IAMRoleSelector` Kubernetes manifests to the cluster.  See [ACK Permission Best Practices](https://docs.aws.amazon.com/eks/latest/userguide/ack-permissions.html#_production_best_practice_iam_role_selectors)

### With a managed policy (capability creates the role)

```typescript
new blueprints.capabilities.AckCapability({
  roleSelectors: [
    new blueprints.capabilities.AckRoleSelectorBuilder("s3-prod")
      .withManagedPolicy("AmazonS3FullAccess")
      .namespaces("production"),
  ],
})
```

### With a custom inline policy

```typescript
new blueprints.capabilities.AckCapability({
  roleSelectors: [
    new blueprints.capabilities.AckRoleSelectorBuilder("s3-readonly")
      .withPolicyDocument(new iam.PolicyDocument({
        statements: [new iam.PolicyStatement({
          actions: ["s3:Get*", "s3:List*"],
          resources: ["*"],
        })],
      }))
      .namespaces("readonly-ns"),
  ],
})
```

### With an existing role ARN

```typescript
new blueprints.capabilities.AckCapability({
  roleSelectors: [
    new blueprints.capabilities.AckRoleSelectorBuilder("rds-prod")
      .withRoleArn("arn:aws:iam::123456789:role/MyExistingRole")
      .namespaces("rds-resources"),
  ],
})
```

### Namespace label selectors

```typescript
new blueprints.capabilities.AckRoleSelectorBuilder("dev-team")
  .withManagedPolicy("AmazonS3FullAccess")
  .namespaceLabels({ environment: "development", team: "sky-team" })
```

### Resource type filtering

```typescript
new blueprints.capabilities.AckRoleSelectorBuilder("s3-only")
  .withManagedPolicy("AmazonS3FullAccess")
  .namespaces("production")
  .resourceTypes({ group: "s3.services.k8s.aws", version: "v1alpha1", kind: "Bucket" })
```

### Cluster-wide (no selectors)

```typescript
new blueprints.capabilities.AckRoleSelectorBuilder("admin")
  .withManagedPolicy("AdministratorAccess")
```

## Builder Methods

| Method | Description |
|--------|-------------|
| `withRoleArn(arn)` | Use an existing IAM role ARN |
| `withManagedPolicy(name)` | Create a role with an AWS managed policy |
| `withPolicyDocument(doc)` | Create a role with a custom inline policy |
| `namespaces(...names)` | Scope to specific namespace names |
| `namespaceLabels(labels)` | Scope to namespaces matching labels |
| `resourceTypes(...types)` | Restrict to specific Kubernetes resource types |

## Additional Access Policies

Some ACK controllers need Kubernetes Secret access (e.g., RDS, ElastiCache, DocumentDB, MSK, Secrets Manager). For these, use `additionalAccessPolicies` with `AmazonEKSSecretAdminPolicy`:

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

new blueprints.capabilities.AckCapability({
  roleSelectors: [
    new blueprints.capabilities.AckRoleSelectorBuilder("rds-prod")
      .withManagedPolicy("AmazonRDSFullAccess")
      .namespaces("database-ns"),
  ],
  additionalAccessPolicies: [
    eks.AccessPolicy.fromAccessPolicyName("AmazonEKSSecretAdminPolicy", {
      accessScopeType: eks.AccessScopeType.NAMESPACE,
      namespaces: ["database-ns"],
    }),
  ],
})
```

For most ACK deployments that only create AWS resources (S3 buckets, DynamoDB tables, Lambda functions), no additional access policies are needed.

See [Additional Access Policies](index.md#additional-access-policies) for more details.

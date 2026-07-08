# kro Capability

The [kro capability](https://docs.aws.amazon.com/eks/latest/userguide/kro.html) enables creation of custom Kubernetes APIs that compose multiple resources into higher-level abstractions. Platform teams can define reusable patterns for common resource combinations, enabling self-service with appropriate guardrails.

This is the AWS-managed alternative to the self-managed [KroAddOn](../addons/kro.md). kro itself does not require AWS IAM permissions — it orchestrates Kubernetes resources only. AWS resource creation is handled by controllers like ACK.

## Usage

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';

const stack = blueprints.EksBlueprint.builder()
  .version("auto")
  .capabilities({
    kro: new blueprints.capabilities.KroCapability(),
  })
  .build(app, 'my-cluster');
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capabilityName` | `string` | `blueprints-kro-capability` | Name for the capability resource |
| `roleArn` | `string` | Auto-created | Existing IAM role ARN to use |
| `policyName` | `string` | - | Custom managed policy name |
| `policyDocument` | `iam.PolicyDocument` | - | Custom inline policy |
| `additionalAccessPolicies` | `IAccessPolicy[]` | - | Additional EKS access policies for the capability role |
| `tags` | `CfnTag[]` | - | CloudFormation tags |

No default IAM policy is attached since kro doesn't interact with AWS APIs directly.

## Additional Access Policies

When ResourceGraphDefinitions create resources, kro needs additional Kubernetes permissions. Use `additionalAccessPolicies`:

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

new blueprints.capabilities.KroCapability({
  additionalAccessPolicies: [
    eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {
      accessScopeType: eks.AccessScopeType.CLUSTER,
    }),
  ],
})
```

See [Additional Access Policies](index.md#additional-access-policies) for more details.

## Using with ACK

kro is commonly paired with the ACK capability to create custom APIs that provision AWS resources:

```typescript
const stack = blueprints.EksBlueprint.builder()
  .version("auto")
  .capabilities({
    ack: new blueprints.capabilities.AckCapability(),
    kro: new blueprints.capabilities.KroCapability(),
  })
  .build(app, 'my-cluster');
```

See the [kro addon documentation](../addons/kro.md) for ResourceGraphDefinition examples.

# Post-Migration Guide

## What Just Happened

After completing the migration (phase CLEANUP), your stack is now:

- Managed by EKS V2 native CloudFormation resources (`AWS::EKS::Cluster` instead of `Custom::AWSCDK-EKS-Cluster`)
- Using API-only authentication (Access Entries, no ConfigMap)
- All Helm releases, manifests, and service accounts reconnected to the V2 cluster construct
- V1 custom resource infrastructure (Lambda functions, nested stacks) removed

Your cluster itself is unchanged — same nodes, same workloads, same networking. Only the CDK/CloudFormation management layer was migrated.

## Step 1: Remove `.migrate()` From Your Code

Change your blueprint code back to the standard builder pattern:

```typescript
// During migration (remove this)
blueprints.EksBlueprint.builder()
  .clusterProvider(new blueprints.GenericClusterProvider({ ... }))
  .addOns(...)
  .teams(...)
  .migrate()              // ← remove this line
  .build(app, 'my-cluster');

// After migration (final state)
blueprints.EksBlueprint.builder()
  .clusterProvider(new blueprints.GenericClusterProvider({ ... }))
  .addOns(...)
  .teams(...)
  .build(app, 'my-cluster');
```

## Step 2: Upgrade to V2-Backed Blueprints Package

Update your `package.json` to the V2-backed release:

```bash
npm install @aws-quickstart/eks-blueprints@^2.0.0
```

This version uses `aws-cdk-lib/aws-eks-v2` internally. The `GenericClusterProvider` API is unchanged — same props, same behavior — but it now creates native CloudFormation resources instead of custom resources.

## Step 3: Deploy and Verify

```bash
# Preview — should show NO changes (or only metadata/tag cleanup)
cdk diff

# Deploy
cdk deploy

# Verify cluster health
aws eks describe-cluster --name <cluster-name> --query "cluster.status"
kubectl get nodes
kubectl get pods -A
```

**Expected `cdk diff` output:** Minimal changes — removal of the `eks:migration:phase` and `eks:migration:suffix` stack tags, possibly metadata path updates. No resource replacements.

## Step 4: Clean Up Migration Artifacts

Remove any local files generated during migration:

```bash
rm -f <stack-name>_resources.json
rm -f <stack-name>_import_mapping.json
```

Remove the migration phase from `cdk.json` if you stored it there:

```json
{
  "context": {
    "eks:migration:phase": "COMPLETE"  // ← remove this line
  }
}
```

## Step 5: Verify V2 Capabilities (Optional)

Now that you're on V2, you can take advantage of new capabilities:

### Multiple Clusters Per Stack

V2 supports multiple clusters in the same stack:

```typescript
const cluster1 = blueprints.EksBlueprint.builder()
  .clusterProvider(...)
  .build(app, 'cluster-1');

const cluster2 = blueprints.EksBlueprint.builder()
  .clusterProvider(...)
  .build(app, 'cluster-2');
```

### Isolated VPC Deployments

V2 clusters can be deployed in fully isolated VPCs (no NAT, no internet):

```typescript
.clusterProvider(new blueprints.GenericClusterProvider({
  isolatedCluster: true,
  vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }],
}))
```

### CloudFormation Escape Hatches

Direct access to the underlying `CfnCluster` for property overrides:

```typescript
const cluster = blueprint.getClusterInfo().cluster;
const cfnCluster = cluster.node.defaultChild as eks.CfnCluster;
cfnCluster.addPropertyOverride('BootstrapSelfManagedAddons', false);
```

### Auto Mode

EKS Auto Mode with managed node pools:

```typescript
.clusterProvider(new blueprints.GenericClusterProvider({
  defaultCapacityType: blueprints.DefaultCapacityType.AUTOMODE,
}))
```

## Troubleshooting

### `cdk diff` shows unexpected resource replacements after removing `.migrate()`

This likely means construct paths changed. Verify:
1. The stack ID in `.build(app, 'my-cluster')` matches what was used during migration
2. No construct IDs were changed between migration and post-migration code

### Helm releases show as "pending-upgrade" or have drift

Run a forced sync:
```bash
# For ArgoCD-managed releases
argocd app sync <app-name> --force

# For direct Helm releases
helm list -A
helm history <release-name> -n <namespace>
```

### Access denied errors after migration

Verify Access Entries are in place:
```bash
aws eks list-access-entries --cluster-name <cluster-name>
aws eks describe-access-entry --cluster-name <cluster-name> \
  --principal-arn <role-arn>
```

### Stack tags still show migration phase

Deploy once after removing `.migrate()` — the tags will be cleaned up automatically since the `EksMigrationStack` is no longer creating them.

### kubectl commands fail with "Unauthorized"

Your kubectl config may still reference the old cluster endpoint. Update it:
```bash
aws eks update-kubeconfig --name <cluster-name> --region <region>
```

## What You Can Remove From Your AWS Account

After confirming the migration is stable (give it a few days), you can clean up orphaned resources that were part of the V1 custom resource infrastructure:

- **Lambda functions** from the KubectlProvider and ClusterResourceProvider (names containing `awscdk-eks` or `KubectlProvider`)
- **IAM roles** for the custom resource handlers (names containing `CreationRole` or `KubectlProvider`)
- **CloudWatch log groups** for the above Lambda functions

These were destroyed during CLEANUP if they didn't have a retain policy, but if you had explicit retain policies on them, they may still exist as unmanaged resources.

To identify them:
```bash
# Find orphaned Lambda functions
aws lambda list-functions --query "Functions[?contains(FunctionName, 'awscdk')].[FunctionName]" --output text

# Find orphaned roles
aws iam list-roles --query "Roles[?contains(RoleName, 'CreationRole') || contains(RoleName, 'KubectlProvider')].[RoleName]" --output text
```

⚠️ Only delete these after confirming they are not referenced by any other stack. Check CloudFormation exports and cross-stack references first.

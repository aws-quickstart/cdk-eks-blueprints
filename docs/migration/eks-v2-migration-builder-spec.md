# EKS V2 Migration Builder — High-Level Design Spec

## Overview

The EKS V2 Migration Builder is a construct that automates the transition of existing EKS Blueprints stacks from CDK EKS V1 (custom-resource-based) to CDK EKS V2 (native CloudFormation resources). It provides a phased, deploy-driven state machine that walks customers through the migration with zero cluster downtime and full rollback capability.

## Problem Statement

EKS Blueprints currently uses `aws-cdk-lib/aws-eks` (V1) which provisions clusters via custom resources (`Custom::AWSCDK-EKS-Cluster`). The new `aws-cdk-lib/aws-eks-v2` module uses native `AWS::EKS::Cluster` CloudFormation resources, providing better reliability, isolated VPC support, multi-cluster-per-stack capability, and full CFN escape hatches.

Customers cannot simply upgrade the Blueprints package version because CloudFormation cannot change a resource's type in-place. The migration requires a multi-deploy orchestration: retaining resources, orphaning V1 constructs, importing physical resources into V2 constructs, and re-establishing custom resource management (Helm charts, manifests, service accounts).

## Goals

- Zero cluster downtime during migration
- No disruption to running workloads or Helm releases
- Full rollback capability at every phase (with two documented one-way doors)
- No changes required to the customer's blueprint configuration (same `GenericClusterProvider` props, same add-ons)
- State persisted in CloudFormation (not local files) so migration survives CI/CD reruns
- Works with the guided bash script or manual `cdk deploy` invocations
- Handles authentication mode migration (ConfigMap → API) as part of the construct

## Non-Goals

- Changing Kubernetes version during migration
- Migrating across accounts or regions
- Providing a standalone CLI binary (the bash script wraps standard `cdk` commands)

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Customer Code                         │
│                                                         │
│   EksMigration(app, 'my-cluster-migration', {           │
│     stackName: 'my-cluster',                            │
│     blueprintProps: { clusterProvider, addOns, ... }     │
│   })                                                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│               EksMigration Construct                    │
│                                                         │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │ Phase State │  │ Add-on       │  │ Resource     │  │
│   │ Machine     │  │ Classifier   │  │ Extractor    │  │
│   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│          │                 │                  │          │
│          ▼                 ▼                  ▼          │
│   ┌─────────────────────────────────────────────────┐   │
│   │           Phase Executor                         │   │
│   │                                                  │   │
│   │  AUTH_TO_HYBRID → MIGRATE_ACCESS_ENTRIES →       │   │
│   │  AUTH_TO_API → ADD_RETAIN → EXTRACT_DEFAULTS →   │   │
│   │  ORPHAN_V1 → ADD_V2 → IMPORT → READD_HELM →     │   │
│   │  CLEANUP                                         │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              CloudFormation Stack                        │
│                                                         │
│   Tag: eks:migration:phase = ORPHAN_V1                  │
│   Tag: eks:migration:suffix = V2                        │
│                                                         │
│   Resources: V1 Cluster, V2 Cluster, shared VPC/Role   │
└─────────────────────────────────────────────────────────┘
```

### State Machine

Migration state is stored as a CloudFormation stack tag (`eks:migration:phase`). The phase is read from CDK context at synth time, allowing advancement via `-c eks:migration:phase=<PHASE>` or by updating `cdk.json`.

```
AUTH_TO_HYBRID ──► MIGRATE_ACCESS_ENTRIES ──► AUTH_TO_API
                                                   │
                                                   ▼
ADD_RETAIN ──► EXTRACT_DEFAULTS ──► ORPHAN_V1 ──► ADD_V2
                                                      │
                                                      ▼
COMPLETE ◄── FINALIZE ◄── CLEANUP ◄── READD_HELM ◄── IMPORT
```

The first three phases (AUTH_TO_HYBRID, MIGRATE_ACCESS_ENTRIES, AUTH_TO_API) handle the authentication prerequisite. If the cluster is already on API mode, these phases are automatically skipped.

Each phase is a `cdk deploy` (or `cdk import` for the IMPORT and FINALIZE phases). The construct synthesizes a different template based on the current phase.

## Phase Definitions

The construct manages the full migration lifecycle including authentication migration and resource preparation. No manual pre-migration steps are required outside the construct.

### State Machine (Complete)

```
AUTH_TO_HYBRID ──► MIGRATE_ACCESS_ENTRIES ──► AUTH_TO_API
      │
      ▼
ADD_RETAIN ──► EXTRACT_DEFAULTS ──► ORPHAN_V1 ──► ADD_V2
                                                      │
                                                      ▼
COMPLETE ◄── FINALIZE ◄── CLEANUP ◄── READD_HELM ◄── IMPORT
```

---

### Phase 0a: AUTH_TO_HYBRID

**Action:** Sets `authenticationMode` to `API_AND_CONFIG_MAP` on the V1 cluster. This enables Access Entries alongside the existing ConfigMap without disrupting current access.

**Effect on deploy:** The cluster's authentication mode is updated. No existing access is disrupted — ConfigMap entries continue to work, and Access Entries can now be added in parallel.

**Minimum version:** Kubernetes ≥ 1.28 (required for Access Entry support). The construct validates this and fails synth if the version is too low.

**Rollback:** Set back to `CONFIG_MAP` (if that was the original mode).

### Phase 0b: MIGRATE_ACCESS_ENTRIES

**Action:** Creates Access Entry equivalents for all existing ConfigMap entries. The construct inspects the blueprint's existing auth configuration (mastersRole, team roles, node group roles) and generates corresponding `grantAccess` calls.

**Effect on deploy:** Access Entries are created for all principals that currently have access via ConfigMap. Both auth mechanisms are active — Access Entries take precedence for any overlapping principal.

**What gets created:**
- Access Entry for `mastersRole` → `AmazonEKSClusterAdminPolicy`
- Access Entries for managed node group roles → `AmazonEKSWorkerNodePolicy`
- Access Entries for Fargate pod execution roles → `AmazonEKSFargatePodExecutionPolicy`
- Access Entries for any team roles defined in the blueprint

**Verification:** Customer should validate cluster access still works for all principals before advancing.

**Rollback:** Remove the Access Entries. ConfigMap entries remain active.

### Phase 0c: AUTH_TO_API

**Action:** Sets `authenticationMode` to `API` and removes all ConfigMap-based auth constructs (`AwsAuth`, `cluster.awsAuth` references).

**Effect on deploy:** ConfigMap is disabled. All access is now exclusively via Access Entries.

**⚠️ One-way door:** Once switched to API mode, you cannot switch back to ConfigMap. The construct displays a prominent warning and requires explicit confirmation via a context flag:

```bash
cdk deploy -c eks:migration:phase=AUTH_TO_API -c eks:migration:confirm-api-mode=true
```

Without the confirmation flag, synth fails with:

```
Error: Phase AUTH_TO_API is irreversible. Switching to API-only auth cannot be undone.
Verify all Access Entries are correct, then re-run with:
  -c eks:migration:confirm-api-mode=true
```

**Rollback:** Not possible after deploy. This is documented clearly in the confirmation prompt.

---

### Phase 1: ADD_RETAIN

**Action:** Applies `RemovalPolicy.RETAIN` to all EKS-related resources in the stack.

**Effect on deploy:** No infrastructure changes. Only `DeletionPolicy` and `UpdateReplacePolicy` are added to resources.

**Purpose:** Ensures no physical resources are deleted when they are later orphaned or removed from the template.

**Rollback:** Remove the migration construct. Resources keep their retain policy (harmless).

### Phase 2: EXTRACT_DEFAULTS

**Action:** Moves auto-created default resources (cluster role, control plane security group, VPC, pod execution role) outside the V1 construct tree. Overrides their logical IDs to match the originals.

**Effect on deploy:** Only `Metadata` path changes on the moved resources. No replacement, no recreation.

**Purpose:** These resources must be shared between V1 and V2 cluster constructs. Moving them outside prevents logical ID conflicts when V2 is added.

**Rollback:** Move resources back inside the construct (or leave them outside — functionally equivalent).

### Phase 3: ORPHAN_V1

**Action:** Removes all V1 constructs from the template except the Cluster and FargateProfile custom resources. Triggers resource extraction (physical ID capture) before deploy.

**Effect on deploy:** Resources are orphaned — CloudFormation stops managing them, but they continue to exist in the account. No deletions.

**What gets orphaned:**
- `AWS::EKS::Nodegroup`
- `AWS::EKS::Addon`
- `AWS::EKS::AccessEntry`
- `Custom::AWSCDK-EKS-HelmChart` (Helm releases stay on cluster)
- `Custom::AWSCDK-EKS-KubernetesResource` (manifests stay on cluster)
- Service account roles and pod identity associations
- OpenIdConnectProvider custom resource

**What stays:**
- `Custom::AWSCDK-EKS-Cluster` (needed for rollback)
- `Custom::AWSCDK-EKS-FargateProfile` (needed for rollback)
- Shared resources (role, SG, VPC)
- KubectlProvider nested stack (needed for rollback)

**Rollback:** Re-import orphaned resources back into V1 constructs using the captured physical IDs.

### Phase 4: ADD_V2

**Action:** Adds V2 `AWS::EKS::Cluster` and `AWS::EKS::FargateProfile` constructs alongside the remaining V1 constructs. Also adds V2 versions of Nodegroups, Managed Addons, and AccessEntries. Does NOT deploy — only synthesizes.

**Effect:** Template is generated with new V2 resources. The `cdk import` command (next phase) will adopt existing physical resources into these new logical resources.

**Construct naming:** V2 constructs use the suffix convention (e.g., `MyClusterV2`). This suffix is stripped by the import mapping script to match V1 physical resources.

**Rollback:** Remove V2 constructs from template. Since they were never deployed, nothing to clean up.

### Phase 5: IMPORT

**Action:** Runs `cdk import` with a generated resource mapping file. The mapping is produced by the resource extraction script which matches V2 construct paths to V1 physical resources.

**Effect:** CloudFormation adopts existing physical resources (cluster, node groups, addons, access entries) under the new V2 logical IDs. No resources are created or modified.

**What gets imported:**
- `AWS::EKS::Cluster`
- `AWS::EKS::FargateProfile`
- `AWS::EKS::Nodegroup` (+ NodeGroup IAM roles)
- `AWS::EKS::Addon`
- `AWS::EKS::AccessEntry`
- `AWS::IAM::OpenIDConnectProvider` (if using OIDC)

**Rollback:** Set RETAIN on V2, orphan V2, re-import into V1.

### Phase 6: READD_HELM

**Action:** Re-adds Helm charts, Kubernetes manifests, and service accounts pointing to the V2 cluster. Adds `kubectlProviderOptions` to enable the kubectl provider. All custom resources use overwrite mode.

**Effect on deploy:** Creates new custom resources that reconcile with existing Helm releases and K8s resources on the cluster. Uses `helm upgrade --install` (overwrite) instead of `helm install` (create).

**What gets re-added:**
- Helm charts (`overwrite: true`)
- Kubernetes manifests (`overwrite: true`)
- Service accounts (`overwriteServiceAccount: true`)
- ALB Controller (if configured)
- KubectlProvider nested stack (for V2 cluster)

**Rollback:** Remove the re-added custom resources (Helm releases remain on cluster, unmanaged).

### Phase 7: CLEANUP

**Action:** Removes the V1 Cluster and FargateProfile custom resources from the template.

**Effect on deploy:** V1 custom resources are orphaned. Physical cluster is already managed by V2. The custom resource Lambda functions are destroyed (no longer needed).

**⚠️ One-way door:** After this phase, you cannot roll back to V1 without re-creating the custom resource infrastructure.

**Rollback:** Not recommended. If needed, rebuild V1 custom resource infrastructure and re-import.

### Phase 8: FINALIZE

**Action:** Removes the suffix from all V2 construct logical IDs. Synthesizes the template with clean, non-suffixed paths (identical to what a greenfield `GenericClusterProviderV2` deployment would produce), then runs `cdk import` to move resources from suffixed to non-suffixed logical IDs.

**Effect:** After import, the stack's logical IDs match exactly what the V2-backed Blueprints package produces from scratch. The customer can now remove `.migrate()` and deploy with **zero diff**.

**Why this is needed:** During ADD_V2/IMPORT, resources were imported under suffixed paths (e.g., `MyClusterV2/NodeGroup`). Without FINALIZE, post-migration code using `GenericClusterProviderV2` would produce non-suffixed paths (`MyCluster/NodeGroup`), causing logical ID mismatches and resource replacement.

**Steps:**
1. `python3 get_cfn_resources.py extract --stack-name <stack>` (captures suffixed physical resources)
2. `cdk synth -c eks:migration:phase=FINALIZE` (produces template with non-suffixed IDs)
3. `python3 get_cfn_resources.py import --stack-name <stack> --physical-resources <resources.json> --suffix V2 --finalize` (generates mapping)
4. `cdk import --resource-mapping <mapping.json> --force` (moves to non-suffixed logical IDs)

**Rollback:** Re-import under suffixed IDs (reverse the mapping).

## Add-on and Team Classification

The construct automatically classifies add-ons and teams based on their deployment mechanism:

| Category | Examples | V1 Resource Type | Migration Action |
|----------|----------|-----------------|-----------------|
| Managed EKS Add-ons | VpcCniAddOn, CoreDnsAddOn, KubeProxyAddOn, EksPodIdentityAgentAddOn | `AWS::EKS::Addon` | Orphan → Import |
| Helm-based Add-ons | ArgoCDAddOn, CalicoOperatorAddOn, MetricsServerAddOn, IngressNginxAddOn, AwsLoadBalancerControllerAddOn, XrayAddOn, ContainerInsightsAddOn, ClusterAutoScalerAddOn | `Custom::AWSCDK-EKS-HelmChart` | Orphan → Re-add with overwrite |
| Manifest-based | Custom KubernetesManifest resources | `Custom::AWSCDK-EKS-KubernetesResource` | Orphan → Re-add with overwrite |
| Teams (ApplicationTeam, PlatformTeam) | Team namespaces, RBAC, quotas, service accounts, access entries | Mixed (see below) | Decomposed by resource type |

### Team Resource Decomposition

Teams produce multiple resource types that are handled individually:

| Team Resource | CFN Type | Migration Action |
|---|---|---|
| `cluster.grantAccess()` (team role access) | `AWS::EKS::AccessEntry` | Orphan → Import |
| Namespace manifest | `Custom::AWSCDK-EKS-KubernetesResource` | Orphan → Re-add with overwrite (already uses `overwrite: true`) |
| RBAC manifest | `Custom::AWSCDK-EKS-KubernetesResource` | Orphan → Re-add with overwrite (already uses `overwrite: true`) |
| ResourceQuota manifest | `Custom::AWSCDK-EKS-KubernetesResource` | Orphan → Re-add with overwrite |
| ServiceAccount | `Custom::AWSCDK-EKS-KubernetesResource` + `AWS::IAM::Role` | Orphan → Re-add with `overwriteServiceAccount: true` |
| Team IAM Role | `AWS::IAM::Role` | Orphan → Import |

No special handling is needed for teams — they decompose into primitives already covered by the phase logic. The team code on the V2 branch already uses `overwrite: true` on its manifests, so re-adding them in the READD_HELM phase is safe.

## State Persistence

**Storage:** CloudFormation stack tags.

```
eks:migration:phase    = ORPHAN_V1
eks:migration:suffix   = V2
eks:migration:started  = 2025-07-16T12:00:00Z
```

**Why stack tags:**
- Co-located with the resource being migrated
- Queryable via `aws cloudformation describe-stacks`
- Survive stack updates without explicit resource management
- No extra resources to create or clean up (unlike SSM parameters)
- Visible in the CloudFormation console

**Phase advancement:** The phase is read from CDK context (`-c eks:migration:phase=X` or `cdk.json`). The construct validates the transition is legal (no skipping phases) and tags the stack with the current phase on each deploy.

## User Interface

### Construct API

```typescript
import { EksMigration } from '@aws-quickstart/eks-blueprints/migration';

const migration = new EksMigration(app, 'my-cluster-migration', {
  // Required
  stackName: 'my-cluster',
  blueprintProps: {
    clusterProvider: new blueprints.GenericClusterProvider({
      version: eks.KubernetesVersion.V1_33,
      managedNodeGroups: [...],
      fargateProfiles: {...},
    }),
    addOns: [
      new blueprints.addons.VpcCniAddOn(),
      new blueprints.addons.ArgoCDAddOn(),
      new blueprints.addons.MetricsServerAddOn(),
    ],
    teams: [...],
  },

  // Optional
  suffix: 'V2',              // Default: 'V2'
  rollbackEnabled: true,     // Default: true (keeps V1 constructs until CLEANUP)
});
```

### Deploy Flow (Manual)

```bash
# Auth migration (skipped if already on API mode)
cdk diff -c eks:migration:phase=AUTH_TO_HYBRID
cdk deploy -c eks:migration:phase=AUTH_TO_HYBRID

cdk diff -c eks:migration:phase=MIGRATE_ACCESS_ENTRIES
cdk deploy -c eks:migration:phase=MIGRATE_ACCESS_ENTRIES

# Verify access works, then commit to API mode (irreversible)
cdk diff -c eks:migration:phase=AUTH_TO_API
cdk deploy -c eks:migration:phase=AUTH_TO_API -c eks:migration:confirm-api-mode=true

# Resource migration
cdk diff -c eks:migration:phase=ADD_RETAIN
cdk deploy -c eks:migration:phase=ADD_RETAIN

cdk diff -c eks:migration:phase=EXTRACT_DEFAULTS
cdk deploy -c eks:migration:phase=EXTRACT_DEFAULTS

cdk diff -c eks:migration:phase=ORPHAN_V1
# Extract physical resources before orphaning
python3 get_cfn_resources.py extract --stack-name my-cluster
cdk deploy -c eks:migration:phase=ORPHAN_V1

cdk synth -c eks:migration:phase=ADD_V2
python3 get_cfn_resources.py import --stack-name my-cluster \
  --physical-resources my-cluster_resources.json --suffix V2
cdk import -c eks:migration:phase=IMPORT \
  --resource-mapping my-cluster_import_mapping.json --force

cdk diff -c eks:migration:phase=READD_HELM
cdk deploy -c eks:migration:phase=READD_HELM

cdk diff -c eks:migration:phase=CLEANUP
cdk deploy -c eks:migration:phase=CLEANUP

# Finalize: remove suffix from logical IDs so post-migration code matches
python3 get_cfn_resources.py extract --stack-name my-cluster
cdk synth -c eks:migration:phase=FINALIZE
python3 get_cfn_resources.py import --stack-name my-cluster \
  --physical-resources my-cluster_resources.json --suffix V2 --finalize
cdk import -c eks:migration:phase=FINALIZE \
  --resource-mapping my-cluster_import_mapping.json --force
```

### Deploy Flow (Guided Script)

```bash
# The script handles confirmations, extraction, and import mapping
./eks-v2-migrate.sh my-cluster

# Output:
# ═══════════════════════════════════════════════════
#   EKS V1 → V2 Migration
#   Stack: my-cluster
#   Current Phase: EXTRACT_DEFAULTS (2/7)
# ═══════════════════════════════════════════════════
#
# Next phase: ORPHAN_V1
#
# Description:
#   Orphan all V1 resources except Cluster and FargateProfile.
#   Resources stay in your account but CloudFormation stops managing them.
#
# Resources to be orphaned:
#   ├─ AWS::EKS::Nodegroup     mng1
#   ├─ AWS::EKS::Addon         vpc-cni
#   ├─ AWS::EKS::Addon         coredns
#   ├─ Helm Chart              argo-cd
#   ├─ Helm Chart              metrics-server
#   └─ ...
#
# Proceed? [y/N]:
```

## Prerequisites

Before using the migration construct, customers must:

1. **Have Kubernetes version ≥ 1.28** — Required for Access Entry support. The construct validates this at synth time.

2. **Have Python 3.6+ with boto3** — For the resource extraction script.

3. **Have appropriate IAM permissions** — `cloudformation:DescribeStackResources`, `cloudformation:DescribeType` for the extraction script.

4. **Be familiar with their cluster's current auth configuration** — The construct handles the migration to API mode, but customers should understand who currently has access to their cluster before the transition.

Note: Authentication mode migration (ConfigMap → API) is handled by the construct itself (Phases 0a–0c). Customers do NOT need to manually migrate auth before using the migration construct.

## Resource Extraction Script

The existing Python script (`get_cfn_resources.py`) handles:

1. **`extract` command:** Captures physical resource IDs and construct paths from the deployed stack. Stores them in `<stack-name>_resources.json`.

2. **`import` command:** Generates the CDK import mapping by matching V2 construct paths (with suffix stripped) to V1 physical resources. Produces `<stack-name>_import_mapping.json`.

The script is included in the Blueprints package and invoked by the bash migration script at the appropriate phases.

## Rollback Strategy

| Current Phase | Rollback Action |
|---|---|
| AUTH_TO_HYBRID | Set auth mode back to CONFIG_MAP. |
| MIGRATE_ACCESS_ENTRIES | Remove the created Access Entries. ConfigMap still active. |
| AUTH_TO_API | ⚠️ One-way door. Cannot revert to ConfigMap. |
| ADD_RETAIN | Remove migration construct. Retain policies are harmless. |
| EXTRACT_DEFAULTS | Revert resource extraction. Only metadata changed. |
| ORPHAN_V1 | Re-import orphaned resources back into V1 constructs. |
| ADD_V2 | Remove V2 constructs (never deployed). |
| IMPORT | Set RETAIN on V2, orphan V2, re-import to V1. |
| READD_HELM | Remove custom resources. Helm releases stay on cluster. |
| CLEANUP | ⚠️ One-way door. V1 custom resource infra is destroyed. |
| FINALIZE | Re-import under suffixed IDs (reverse the mapping). |

The construct exposes a `rollback` phase that reverses the migration based on current state:

```bash
cdk deploy -c eks:migration:phase=ROLLBACK
```

## Post-Migration

See [Post-Migration Guide](./post-migration-guide.md) for the full walkthrough.

Summary:

1. Remove `.migrate()` from your builder chain
2. Upgrade to `@aws-quickstart/eks-blueprints@^2.0.0` (V2-backed)
3. `cdk deploy` — should show no meaningful changes
4. Clean up local migration artifacts (`_resources.json`, `_import_mapping.json`)
5. Remove `eks:migration:phase` from `cdk.json` context

After migration, your code is identical to what it was before — same props, same add-ons. The `GenericClusterProvider` API is unchanged; it now creates V2 resources internally.

```typescript
// Post-migration — identical to pre-migration code
blueprints.EksBlueprint.builder()
  .clusterProvider(new blueprints.GenericClusterProvider({
    version: eks.KubernetesVersion.V1_33,
    managedNodeGroups: [...],
  }))
  .addOns(
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.ArgoCDAddOn(),
  )
  .build(app, 'my-cluster');
```

## Package Versioning Strategy

The migration construct must be available on a V1-backed release of Blueprints, since it needs to coexist with V1 constructs during the transition:

```
v1.x.x (current main)      → V1 only, no migration support
v1.y.0 (migration release)  → V1 + EksMigration construct (imports eks-v2 as peer dep)
v2.0.0 (V2 release)         → V2 only, migration construct deprecated/removed
```

The `EksMigration` construct internally imports both `aws-cdk-lib/aws-eks` (for V1 cluster management) and `aws-cdk-lib/aws-eks-v2` (for creating V2 constructs during ADD_V2 phase).


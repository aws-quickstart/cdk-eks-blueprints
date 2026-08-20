import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as eksv2 from 'aws-cdk-lib/aws-eks-v2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo, Team } from '../spi';
import { BlueprintBuilder } from '../stacks/eks-blueprint-stack';
import { EksBlueprintProps } from '../stacks/eks-blueprint-construct';
import { EksBlueprint } from '../stacks/eks-blueprint-stack';
import { CoreAddOn } from '../addons/core-addon';
import { HelmAddOn } from '../addons/helm-addon';
import { selectKubectlLayer } from '../cluster-providers/generic-cluster-provider';

// ─── Types ─────────────────────────────────────────────────────────────

export enum MigrationPhase {
  AUTH_TO_HYBRID = 'AUTH_TO_HYBRID',
  AUTH_TO_API = 'AUTH_TO_API',
  ADD_RETAIN = 'ADD_RETAIN',
  ORPHAN_V1 = 'ORPHAN_V1',
  ADD_V2 = 'ADD_V2',
  IMPORT = 'IMPORT',
  READD_HELM = 'READD_HELM',
  CLEANUP = 'CLEANUP',
  FINALIZE = 'FINALIZE',
  COMPLETE = 'COMPLETE',
  ROLLBACK = 'ROLLBACK',
}

const PHASE_ORDER: MigrationPhase[] = [
  MigrationPhase.AUTH_TO_HYBRID,
  MigrationPhase.AUTH_TO_API,
  MigrationPhase.ADD_RETAIN,
  MigrationPhase.ORPHAN_V1,
  MigrationPhase.ADD_V2,
  MigrationPhase.IMPORT,
  MigrationPhase.READD_HELM,
  MigrationPhase.CLEANUP,
  MigrationPhase.FINALIZE,
  MigrationPhase.COMPLETE,
];

export interface EksMigrationOptions {
  readonly suffix?: string;
  readonly rollbackEnabled?: boolean;
}

export enum AddOnMigrationType {
  MANAGED_ADDON = 'MANAGED_ADDON',
  HELM_CHART = 'HELM_CHART',
  MANIFEST = 'MANIFEST',
}

// ─── MigrationBuilder ──────────────────────────────────────────────────

/**
 * Wraps a BlueprintBuilder. Produces the same stack as the original builder
 * but with phase-dependent modifications for migration.
 */
export class MigrationBuilder {
  private readonly sourceBuilder: BlueprintBuilder;
  private readonly options: EksMigrationOptions;

  constructor(sourceBuilder: BlueprintBuilder, options?: EksMigrationOptions) {
    this.sourceBuilder = sourceBuilder;
    this.options = options ?? {};
  }

  /**
   * Builds the migration stack. Uses the sourceBuilder's own build() to
   * produce the same construct tree (and therefore same logical IDs) as
   * the original V1 stack. Then applies phase-specific modifications.
   */
  public build(scope: Construct, id: string, stackProps?: cdk.StackProps): EksBlueprint {
    const phase = resolvePhase(scope);
    validatePhase(scope, phase);

    const suffix = this.options.suffix ?? 'V2';
    const blueprintProps = this.sourceBuilder.props;

    // Enable native OIDC provider for V2 phases — uses AWS::IAM::OIDCProvider (L1)
    // instead of Custom::AWSCDKOpenIdConnectProvider which conflicts with the
    // orphaned V1 OIDC provider. The old one must be deleted from IAM before READD_HELM.
    scope.node.setContext('@aws-cdk/aws-eks:useNativeOidcProvider', true);

    // For V1 phases: build normally via the source builder, then modify post-hoc
    // For V2 phases: build a modified version via a cloned builder
    let stack: EksBlueprint;

    switch (phase) {
      case MigrationPhase.AUTH_TO_HYBRID:
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API_AND_CONFIG_MAP);
        stack = this.sourceBuilder.build(scope, id, stackProps);
        break;

      case MigrationPhase.AUTH_TO_API:
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API);
        stack = this.sourceBuilder.build(scope, id, stackProps);
        break;

      case MigrationPhase.ADD_RETAIN:
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API);
        stack = this.sourceBuilder.build(scope, id, stackProps);
        // RETAIN must be applied AFTER async addon tasks resolve (CfnAddon is created inside async deploy())
        stack.waitForAsyncTasks().then(() => applyRetainRecursive(stack));
        break;

      case MigrationPhase.ORPHAN_V1: {
        // All add-ons and teams safe to remove — RETAIN from ADD_RETAIN phase
        // prevents custom resource delete handlers from running.
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API);
        const orphanBuilder = this.sourceBuilder.clone()
          .withBlueprintProps({ addOns: [], teams: [] });
        stack = orphanBuilder.build(scope, id, stackProps);
        stack.waitForAsyncTasks().then(() => applyRetainRecursive(stack));
        break;
      }

      case MigrationPhase.ADD_V2:
      case MigrationPhase.IMPORT: {
        // V1 skeleton + V2 cluster and L1 resources (for import)
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API);
        const orphanBuilderV2 = this.sourceBuilder.clone()
          .withBlueprintProps({ addOns: [], teams: [] });
        stack = orphanBuilderV2.build(scope, id, stackProps);
        stack.waitForAsyncTasks().then(() => applyRetainRecursive(stack));
        addV2Resources(stack, stack.getClusterInfo(), blueprintProps, suffix, false);
        guardSynthOnly(stack, phase);
        break;
      }

      case MigrationPhase.READD_HELM: {
        // V1 skeleton + V2 cluster with kubectl + helm/manifests/teams on V2
        this.setProviderAuthMode(blueprintProps, eks.AuthenticationMode.API);
        const orphanBuilderHelm = this.sourceBuilder.clone()
          .withBlueprintProps({ addOns: [], teams: [] });
        stack = orphanBuilderHelm.build(scope, id, stackProps);
        stack.waitForAsyncTasks().then(() => applyRetainRecursive(stack));
        addV2Resources(stack, stack.getClusterInfo(), blueprintProps, suffix, true);
        break;
      }

      case MigrationPhase.CLEANUP: {
        // V2 only — no V1 skeleton. Build fresh V2 resources from config.
        stack = new EksBlueprint(scope, { id, compatibilityMode: true } as EksBlueprintProps, stackProps);
        buildV2Only(stack, blueprintProps, suffix, true);
        break;
      }

      case MigrationPhase.FINALIZE: {
        // V2 without suffix — final clean state for import
        stack = new EksBlueprint(scope, { id, compatibilityMode: true } as EksBlueprintProps, stackProps);
        buildV2Only(stack, blueprintProps, '', true);
        guardSynthOnly(stack, phase);
        break;
      }

      case MigrationPhase.COMPLETE: {
        // Same as FINALIZE but deployable (terminal state)
        stack = new EksBlueprint(scope, { id, compatibilityMode: true } as EksBlueprintProps, stackProps);
        buildV2Only(stack, blueprintProps, '', true);
        break;
      }

      case MigrationPhase.ROLLBACK:
        stack = this.sourceBuilder.build(scope, id, stackProps);
        break;

      default:
        stack = this.sourceBuilder.build(scope, id, stackProps);
    }

    // For import phases, tags must match what's currently deployed (no changes allowed
    // in import changesets). Use the last deployed phase value instead of the current phase.
    const importPhases: MigrationPhase[] = [MigrationPhase.ADD_V2, MigrationPhase.IMPORT, MigrationPhase.FINALIZE];
    const tagPhaseValue = importPhases.includes(phase)
      ? (scope.node.tryGetContext('eks:migration:last-deployed-phase') ?? 'ORPHAN_V1')
      : phase;
    cdk.Tags.of(stack).add('eks:migration:phase', tagPhaseValue);
    cdk.Tags.of(stack).add('eks:migration:suffix', suffix);

    return stack;
  }

  public async buildAsync(scope: Construct, id: string, stackProps?: cdk.StackProps): Promise<EksBlueprint> {
    const stack = this.build(scope, id, stackProps);
    return stack.waitForAsyncTasks();
  }

  /**
   * Mutates the cluster provider's authenticationMode before building.
   */
  private setProviderAuthMode(blueprintProps: Partial<EksBlueprintProps>, mode: eks.AuthenticationMode): void {
    const provider = blueprintProps.clusterProvider;
    if (provider && 'props' in provider) {
      (provider as any).props = {
        ...(provider as any).props,
        authenticationMode: mode,
      };
    }
  }
}

// ─── Phase Resolution & Validation (free functions) ────────────────────

function resolvePhase(scope: Construct): MigrationPhase {
  const ctx = scope.node.tryGetContext('eks:migration:phase');
  if (!ctx) return MigrationPhase.AUTH_TO_HYBRID;
  if (!Object.values(MigrationPhase).includes(ctx as MigrationPhase)) {
    throw new Error(`Invalid migration phase: "${ctx}". Valid: ${PHASE_ORDER.join(', ')}`);
  }
  return ctx as MigrationPhase;
}

function validatePhase(scope: Construct, phase: MigrationPhase): void {
  if (phase === MigrationPhase.ROLLBACK) return;

  const lastDeployed = scope.node.tryGetContext('eks:migration:last-deployed-phase') as MigrationPhase | undefined;
  if (lastDeployed) {
    const lastIdx = PHASE_ORDER.indexOf(lastDeployed);
    const reqIdx = PHASE_ORDER.indexOf(phase);

    // Synth-only phases (ADD_V2, FINALIZE) are never deployed — they only produce
    // a template for `cdk import`. Allow skipping over them in validation.
    const synthOnlyPhases = [MigrationPhase.ADD_V2, MigrationPhase.FINALIZE];
    const skipped = PHASE_ORDER.slice(lastIdx + 1, reqIdx)
      .filter(p => !synthOnlyPhases.includes(p));

    if (skipped.length > 0) {
      throw new Error(`Cannot skip to ${phase}. Last: ${lastDeployed}. Skipped: ${skipped.join(', ')}`);
    }
  }

  if (phase === MigrationPhase.AUTH_TO_API) {
    if (scope.node.tryGetContext('eks:migration:confirm-api-mode') !== 'true') {
      throw new Error('AUTH_TO_API is irreversible. Re-run with -c eks:migration:confirm-api-mode=true');
    }
  }
  if (phase === MigrationPhase.CLEANUP) {
    if (scope.node.tryGetContext('eks:migration:confirm-cleanup') !== 'true') {
      throw new Error('CLEANUP is irreversible. Re-run with -c eks:migration:confirm-cleanup=true');
    }
  }
}

// ─── Post-hoc Helpers ──────────────────────────────────────────────────

function applyRetainRecursive(construct: Construct): void {
  if (construct instanceof cdk.CfnResource) {
    construct.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
  }
  for (const child of construct.node.children) {
    if (child instanceof Construct) {
      applyRetainRecursive(child);
    }
  }
}

function guardSynthOnly(stack: cdk.Stack, phase: string): void {
  const allowed = stack.node.tryGetContext('eks:migration:allow-import-deploy');
  if (allowed === 'true') return;

  cdk.Annotations.of(stack).addWarning(
    `⚠️ Phase ${phase} must use \`cdk import\`, not \`cdk deploy\`.\n` +
    `Run: cdk synth, then get_cfn_resources.py import, then cdk import.\n` +
    `Deploying this phase directly will attempt to CREATE resources that already exist.\n` +
    `Suppress: -c eks:migration:allow-import-deploy=true`
  );
}

function classifyAddOns(addOns: ClusterAddOn[]): Map<AddOnMigrationType, ClusterAddOn[]> {
  const result = new Map<AddOnMigrationType, ClusterAddOn[]>([
    [AddOnMigrationType.MANAGED_ADDON, []],
    [AddOnMigrationType.HELM_CHART, []],
    [AddOnMigrationType.MANIFEST, []],
  ]);
  for (const addOn of addOns) {
    if (addOn instanceof CoreAddOn) {
      result.get(AddOnMigrationType.MANAGED_ADDON)!.push(addOn);
    } else if (addOn instanceof HelmAddOn) {
      result.get(AddOnMigrationType.HELM_CHART)!.push(addOn);
    } else {
      result.get(AddOnMigrationType.MANIFEST)!.push(addOn);
    }
  }
  return result;
}

// ─── V2 Resource Creation ──────────────────────────────────────────────

/**
 * Adds V2 resources to an existing stack that already has V1 resources.
 * Reads cluster properties from the V1 ClusterInfo.
 */
function addV2Resources(
  stack: cdk.Stack,
  v1ClusterInfo: ClusterInfo,
  blueprintProps: Partial<EksBlueprintProps>,
  suffix: string,
  withKubectl: boolean,
): void {
  const v1Cluster = v1ClusterInfo.cluster as eks.Cluster;
  const version = v1ClusterInfo.version;
  const id = `${stack.node.id}${suffix}`;

  // Pull the original provider props to mirror V1 config exactly
  const provider = blueprintProps.clusterProvider;
  const providerProps = (provider && 'props' in provider) ? (provider as any).props : {};

  const kubectlLayer = withKubectl ? selectKubectlLayer(new Construct(stack, `kubectlV2-${suffix}`), version) : undefined;
  const kubectlProviderOptions = kubectlLayer ? { kubectlLayer } : undefined;

  const v2Cluster = new eksv2.Cluster(stack, id, {
    ...providerProps,
    version,
    clusterName: v1Cluster.clusterName,
    vpc: v1Cluster.vpc,
    role: v1Cluster.role,
    securityGroup: findControlPlaneSecurityGroup(v1Cluster),
    // Must match V1 — prevents V2 from creating auto mode pools or new node groups
    defaultCapacity: 0,
    defaultCapacityType: eksv2.DefaultCapacityType.NODEGROUP,
    kubectlProviderOptions,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
  });

  // Managed addons — skip if already imported (READD_HELM phase)
  if (!withKubectl) {
    // Only create addon constructs during ADD_V2/IMPORT (they get imported)
    const classified = classifyAddOns(blueprintProps.addOns ?? []);
    for (const addOn of classified.get(AddOnMigrationType.MANAGED_ADDON) ?? []) {
      const coreAddon = addOn as CoreAddOn;
      const addonName = coreAddon.coreAddOnProps.addOnName;
      new eksv2.Addon(stack, `${addonName}-addOn${suffix}`, {
        cluster: v2Cluster,
        addonName,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });
    }
  }

  // Deploy helm/manifests/teams if kubectl is available (READD_HELM phase)
  if (withKubectl) {
    const v2ClusterInfo = new ClusterInfo(
      v2Cluster as unknown as eks.ICluster,
      version, [], [], false, [], v2Cluster,
    );

    const classified = classifyAddOns(blueprintProps.addOns ?? []);
    for (const addOn of classified.get(AddOnMigrationType.HELM_CHART) ?? []) {
      addOn.deploy(v2ClusterInfo);
    }
    for (const addOn of classified.get(AddOnMigrationType.MANIFEST) ?? []) {
      addOn.deploy(v2ClusterInfo);
    }
    for (const team of blueprintProps.teams ?? []) {
      team.setup(v2ClusterInfo);
    }
  }
}

/**
 * Builds V2-only resources from blueprint config (no V1 in the stack).
 * Used by CLEANUP, FINALIZE, COMPLETE phases.
 */
function buildV2Only(
  stack: cdk.Stack,
  blueprintProps: Partial<EksBlueprintProps>,
  suffix: string,
  withKubectl: boolean,
): void {
  const provider = blueprintProps.clusterProvider;
  const providerProps = (provider && 'props' in provider) ? (provider as any).props : {};

  const version = providerProps.version ?? blueprintProps.version ?? eks.KubernetesVersion.V1_33;
  const clusterName = providerProps.clusterName ?? stack.node.id;
  const isPrivate = providerProps.privateCluster ?? false;

  const vpc = providerProps.vpc ?? new ec2.Vpc(stack, `Vpc${suffix}`, { maxAzs: 2 });
  const role = providerProps.role ?? new iam.Role(stack, `ClusterRole${suffix}`, {
    assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
    managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy')],
  });

  const id = suffix ? `${stack.node.id}${suffix}` : stack.node.id;
  const kubectlScope = suffix ? new Construct(stack, `kubectlV2-${suffix}`) : stack;
  const kubectlLayer = withKubectl ? selectKubectlLayer(kubectlScope, version) : undefined;
  const kubectlProviderOptions = kubectlLayer ? { kubectlLayer } : undefined;

  const v2Cluster = new eksv2.Cluster(stack, id, {
    ...providerProps,
    version,
    clusterName,
    vpc,
    role,
    defaultCapacity: 0,
    defaultCapacityType: eksv2.DefaultCapacityType.NODEGROUP,
    kubectlProviderOptions,
  });

  // Managed addons
  const classified = classifyAddOns(blueprintProps.addOns ?? []);
  for (const addOn of classified.get(AddOnMigrationType.MANAGED_ADDON) ?? []) {
    const coreAddon = addOn as CoreAddOn;
    const addonName = coreAddon.coreAddOnProps.addOnName;
    new eksv2.Addon(stack, `${addonName}-addOn${suffix}`, {
      cluster: v2Cluster,
      addonName,
    });
  }

  // Deploy helm/manifests/teams
  if (withKubectl) {
    const v2ClusterInfo = new ClusterInfo(
      v2Cluster as unknown as eks.ICluster,
      version, [], [], false, [], v2Cluster,
    );

    for (const addOn of classified.get(AddOnMigrationType.HELM_CHART) ?? []) {
      addOn.deploy(v2ClusterInfo);
    }
    for (const addOn of classified.get(AddOnMigrationType.MANIFEST) ?? []) {
      addOn.deploy(v2ClusterInfo);
    }
    for (const team of blueprintProps.teams ?? []) {
      team.setup(v2ClusterInfo);
    }
  }
}

// Re-export the stack type for consumers
export type EksMigrationStack = EksBlueprint;

/**
 * Finds the user-provided ControlPlaneSecurityGroup from the V1 cluster's construct tree.
 * This is the SG that was passed to (or auto-created by) the GenericClusterProvider,
 * NOT the EKS-managed cluster security group.
 */
function findControlPlaneSecurityGroup(cluster: eks.Cluster): ec2.ISecurityGroup | undefined {
  // The V1 GenericClusterProvider creates a SecurityGroup named 'ControlPlaneSecurityGroup'
  // as a child of the cluster construct. Find it in the tree.
  for (const child of cluster.node.children) {
    if (child instanceof ec2.SecurityGroup && child.node.id === 'ControlPlaneSecurityGroup') {
      return child;
    }
  }
  // If using the connections property, the first non-cluster SG is the user-provided one
  // connections.securityGroups = [clusterSG, userProvidedSG]
  const sgs = cluster.connections.securityGroups;
  if (sgs.length > 1) {
    return sgs[1];
  }
  return undefined;
}

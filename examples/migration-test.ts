import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import * as bp from '../lib';

/**
 * Migration Test Example
 *
 * A single stack that can be deployed in 3 modes to test the full migration lifecycle.
 * The mode is selected via CDK context: -c migration:mode=<v1|migrate|v2>
 *
 * Phase resolution: When mode=migrate, the phase is read from -c eks:migration:phase.
 * If not provided, it defaults to AUTH_TO_HYBRID (the first phase).
 *
 * Usage:
 *   # 1. Deploy the V1 cluster
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=v1
 *
 *   # 2. Run migration phases
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=AUTH_TO_HYBRID
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=AUTH_TO_API -c eks:migration:confirm-api-mode=true
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=ADD_RETAIN
 *
 *   # Extract physical resource IDs BEFORE orphaning (required for import later)
 *   python3 scripts/get_cfn_resources.py extract --stack-name migration-test
 *
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=ORPHAN_V1
 *   npx cdk --app "npx ts-node examples/migration-test.ts" synth -c migration:mode=migrate -c eks:migration:phase=ADD_V2
 *   # Run: python3 scripts/get_cfn_resources.py import, then cdk import:
 *   python3 scripts/get_cfn_resources.py import --stack-name migration-test --physical-resources migration-test_resources.json --suffix V2
 *   npx cdk --app "npx ts-node examples/migration-test.ts" import -c migration:mode=migrate -c eks:migration:phase=IMPORT -c eks:migration:last-deployed-phase=ORPHAN_V1 -c eks:migration:allow-import-deploy=true --resource-mapping migration-test_import_mapping.json --force
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=READD_HELM
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=CLEANUP -c eks:migration:confirm-cleanup=true
 *   # Run: python3 get_cfn_resources.py extract/import for finalize, then:
 *   python3 scripts/get_cfn_resources.py extract --stack-name migration-test
 *   npx cdk --app "npx ts-node examples/migration-test.ts" synth -c migration:mode=migrate -c eks:migration:phase=FINALIZE
 *   python3 scripts/get_cfn_resources.py import --stack-name migration-test --physical-resources migration-test_resources.json --suffix V2
 *   npx cdk --app "npx ts-node examples/migration-test.ts" import -c migration:mode=migrate -c eks:migration:phase=FINALIZE -c eks:migration:last-deployed-phase=CLEANUP -c eks:migration:allow-import-deploy=true --resource-mapping migration-test_import_mapping.json --force
 *   npx cdk --app "npx ts-node examples/migration-test.ts" deploy -c migration:mode=migrate -c eks:migration:phase=COMPLETE
 *
 *   # 3. Verify V2 produces zero diff
 *   npx cdk --app "npx ts-node examples/migration-test.ts" diff -c migration:mode=v2
 *   # Expected: "There were no differences"
 */

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const mode = app.node.tryGetContext('migration:mode') ?? 'v1';

const STACK_NAME = 'migration-test';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Configuration
// Same across all modes — proving the migration preserves customer intent.
// ─────────────────────────────────────────────────────────────────────────────

const clusterVersion = KubernetesVersion.V1_35;

const managedNodeGroupConfig: bp.ManagedNodeGroup[] = [
  {
    id: 'default-mng',
    instanceTypes: [new ec2.InstanceType('m5.large')],
    minSize: 2,
    maxSize: 4,
    desiredSize: 2,
  },
];

const addOns: bp.ClusterAddOn[] = [
  new bp.addons.VpcCniAddOn(),
  new bp.addons.CoreDnsAddOn(),
  new bp.addons.KubeProxyAddOn(),
  new bp.addons.MetricsServerAddOn(),
  new bp.addons.AwsLoadBalancerControllerAddOn(),
];

/**
 * Simple manifest-based addon for testing migration of KubernetesManifest resources.
 */
class TestConfigMapAddOn implements bp.ClusterAddOn {
  deploy(clusterInfo: bp.ClusterInfo): void {
    new eks.KubernetesManifest(clusterInfo.cluster.stack, 'TestConfigMap', {
      cluster: clusterInfo.cluster,
      manifest: [{
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: 'migration-test-config',
          namespace: 'default',
        },
        data: {
          'migration-status': 'testing',
        },
      }],
      overwrite: true,
    });
  }
}

const teams: bp.Team[] = [
  new bp.ApplicationTeam({
    name: 'team-backend',
    users: [],
  }),
  new bp.PlatformTeam({
    name: 'platform-admin',
    users: [],
  }),
];

// ─────────────────────────────────────────────────────────────────────────────
// Mode Selection
// ─────────────────────────────────────────────────────────────────────────────

switch (mode) {
  case 'v1':
    // Initial V1 deployment — GenericClusterProvider (custom resource based)
    bp.EksBlueprint.builder()
      .account(account)
      .region(region)
      .version(clusterVersion)
      .clusterProvider(new bp.GenericClusterProvider({
        version: clusterVersion,
        managedNodeGroups: managedNodeGroupConfig,
      }))
      .addOns(...addOns, new TestConfigMapAddOn())
      .teams(...teams)
      .build(app, STACK_NAME);
    break;

  case 'migrate':
    // Migration in progress — same config + .migrate()
    bp.EksBlueprint.builder()
      .account(account)
      .region(region)
      .version(clusterVersion)
      .clusterProvider(new bp.GenericClusterProvider({
        version: clusterVersion,
        managedNodeGroups: managedNodeGroupConfig,
      }))
      .addOns(...addOns, new TestConfigMapAddOn())
      .teams(...teams)
      .migrate({ suffix: 'V2' })
      .build(app, STACK_NAME);
    break;

  case 'v2':
    // Final V2 state — proves migration left stack in correct state
    bp.EksBlueprint.builder()
      .account(account)
      .region(region)
      .version(clusterVersion)
      .clusterProvider(new bp.GenericClusterProviderV2({
        version: clusterVersion,
        managedNodeGroups: managedNodeGroupConfig,
      }))
      .addOns(...addOns, new TestConfigMapAddOn())
      .teams(...teams)
      .build(app, STACK_NAME);
    break;

  default:
    throw new Error(`Invalid migration:mode "${mode}". Use: v1, migrate, or v2`);
}

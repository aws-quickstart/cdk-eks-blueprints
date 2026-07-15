import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks-v2';
import { CfnWorkspace } from 'aws-cdk-lib/aws-aps';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const ampProvider = new blueprints.CreateAmpProvider("amp-ws", "nfm-test-amp-ws");

// Example customer issue reproduction:
const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.EksPodIdentityAgentAddOn,
  new blueprints.AwsNetworkFlowMonitorAddOn({
    openMetrics: "on",
    openMetricsAddress: "0.0.0.0",
    openMetricsPort: 9109
  }),
  new blueprints.CertManagerAddOn,
  new blueprints.AdotCollectorAddOn(),
  new blueprints.AmpAddOn({
    ampPrometheusEndpoint: blueprints.getNamedResource<CfnWorkspace>("amp-ws-provider").attrPrometheusEndpoint
  })
];

const stack = blueprints.GravitonBuilder.builder({
  version: KubernetesVersion.V1_33,
  amiType: NodegroupAmiType.AL2023_ARM_64_STANDARD
})
  .account(account)
  .region(region)
  .addOns(...addOns)
  .resourceProvider("amp-ws-provider", ampProvider)
  .version("auto")
  .build(app, 'nfm-test-debug-stack');

void stack; // Keep for debugging

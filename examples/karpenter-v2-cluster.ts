import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { DefaultCapacityType } from 'aws-cdk-lib/aws-eks-v2';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .version("auto")
    .clusterProvider(new blueprints.GenericClusterProvider({
        defaultCapacityType: DefaultCapacityType.NODEGROUP,
        managedNodeGroups: [{
            id: "default",
            minSize: 1,
            maxSize: 3,
            desiredSize: 2,
        }],
    }))
    .addOns(
        new blueprints.addons.VpcCniAddOn(),
        new blueprints.addons.CoreDnsAddOn(),
        new blueprints.addons.KubeProxyAddOn(),
        new blueprints.addons.EksPodIdentityAgentAddOn(),
        new blueprints.addons.KarpenterV1AddOn({
            podIdentity: true,
            nodePoolSpec: {
                requirements: [
                    { key: "karpenter.k8s.aws/instance-category", operator: "In", values: ["c", "m", "r"] },
                    { key: "karpenter.k8s.aws/instance-generation", operator: "Gt", values: ["2"] },
                    { key: "karpenter.sh/capacity-type", operator: "In", values: ["spot", "on-demand"] },
                    { key: "kubernetes.io/arch", operator: "In", values: ["amd64"] },
                ],
                disruption: {
                    consolidationPolicy: "WhenEmpty",
                    consolidateAfter: "30s",
                },
            },
            ec2NodeClassSpec: {
                amiFamily: "AL2023",
                amiSelectorTerms: [{ alias: "al2023@latest" }],
                subnetSelectorTerms: [{ tags: { "Name": "*Private*" } }],
                securityGroupSelectorTerms: [{ tags: { "aws:eks:cluster-name": "karpenter-v2-cluster" } }],
            },
        }),
    )
    .build(app, 'karpenter-v2-cluster');

void stack;

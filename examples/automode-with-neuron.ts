import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { Construct } from 'constructs';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { KubectlV34Layer } from '@aws-cdk/lambda-layer-kubectl-v34';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks-v2';


class CustomAutomodeClusterProvider extends blueprints.AutomodeClusterProvider {
    protected getKubectlLayer(scope: Construct, _version: KubernetesVersion): ILayerVersion | undefined {
        return new KubectlV34Layer(scope, "kubectllayer34");
    }
}

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
];

const clusterProvider = new CustomAutomodeClusterProvider({
  nodePools: ["system", "general-purpose"],
  extraNodePools: {
    inf2: {
      replicas: 1,
      requirements: [
        {key: "node.kubernetes.io/instance-type", operator: "In", values: ["inf2.8xlarge"]},
        {key: "kubernetes.io/arch", operator: "In", values: ["amd64"]},
      ],
    },
    trn2: {
      replicas: 1,
      requirements: [
        {key: "node.kubernetes.io/instance-type", operator: "In", values: ["trn1.2xlarge"]},
        {key: "kubernetes.io/arch", operator: "In", values: ["amd64"]},
      ],
    },
  },
});

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .clusterProvider(clusterProvider)
    .addOns(...addOns)
    .version("auto")
    .build(app, 'automode-with-neuron-stack');

// Add access entry for a user/role
// const userRole = iam.Role.fromRoleArn(stack, 'UserRole', 
//     `arn:aws:iam::${account}:role/MyUserRole`);

// new eks.CfnAccessEntry(stack, 'UserAccessEntry', {
//     clusterName: stack.getClusterInfo().cluster.clusterName,
//     principalArn: userRole.roleArn,
//     type: 'STANDARD',
//     accessPolicies: [{
//         policyArn: 'arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy',
//         accessScope: {
//             type: 'cluster'
//         }
//     }]
// });

void stack;

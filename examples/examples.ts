import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as bp from '../lib';
import * as bcrypt from 'bcrypt';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { IngressNginxAddOn, AwsLoadBalancerControllerAddOn } from '../lib/addons';

/**
 * You can run these examples with the following command:
 * <code>
 * npm run examples list
 * npm run examples deploy <blueprint-name>
 * </code>
 */
const app = new cdk.App();

const KMS_RESOURCE = "kms-key-22";
const base = bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .resourceProvider(bp.GlobalResources.Vpc, new bp.VpcProvider("default")) // saving time on VPC creation
    .resourceProvider(KMS_RESOURCE, {
        provide(context): cdk.aws_kms.Key {
            return new kms.Key(context.scope, KMS_RESOURCE);
        }
    });

const kmsKey: kms.Key = bp.getNamedResource(KMS_RESOURCE);
const builder = () => base.clone();

const publicCluster = {
    version: KubernetesVersion.V1_30,
    vpcSubnets: [{ subnetType: ec2.SubnetType.PUBLIC }]
};

builder()
    .clusterProvider(new bp.FargateClusterProvider(publicCluster))
    .build(app, "fargate-blueprint");

builder()
    .clusterProvider(new bp.MngClusterProvider({
        ...publicCluster
    }))
    .enableControlPlaneLogTypes(bp.ControlPlaneLogType.API, bp.ControlPlaneLogType.AUDIT)
    .build(app, "mng-blueprint");

builder()
    .clusterProvider(new bp.MngClusterProvider(publicCluster))
    .addOns(buildArgoBootstrap())
    .build(app, 'argo-blueprint1');

// New blueprint with IngressNginxAddOn
builder()
    .clusterProvider(new bp.MngClusterProvider(publicCluster))
    .addOns(
        new AwsLoadBalancerControllerAddOn(),
        new IngressNginxAddOn({
            crossZoneEnabled: true,
            internetFacing: true,
            targetType: 'ip'
        })
    )
    .build(app, 'ingress-nginx-blueprint');

bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .version(KubernetesVersion.V1_29)
    .compatibilityMode(false)
    .build(app, 'eks-blueprint');

const karpenterClusterName = "karpenter-test";
const karpenterAddOn = createKarpenterAddOn(karpenterClusterName);

bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAAULT_REGION!)
    .version(KubernetesVersion.V1_28)
    .addOns(
        new bp.addons.ArgoCDAddOn(),
        new bp.addons.CalicoOperatorAddOn(),
        new bp.addons.MetricsServerAddOn(),
        new bp.addons.CoreDnsAddOn(),
        new bp.addons.AwsLoadBalancerControllerAddOn(),
        new bp.addons.EksPodIdentityAgentAddOn(),
        new bp.addons.VpcCniAddOn(),
        new bp.addons.KubeProxyAddOn(),
        new bp.addons.CloudWatchLogsAddon({
            namespace: 'aws-for-fluent-bit',
            createNamespace: true,
            serviceAccountName: 'aws-fluent-bit-for-cw-sa',
            logGroupPrefix: `/aws/eks/${karpenterClusterName}`,
            logRetentionDays: 7
        }),
        karpenterAddOn
    )
    .build(app, karpenterClusterName);

function buildArgoBootstrap() {
    return new bp.addons.ArgoCDAddOn({
        bootstrapRepo: {
            repoUrl: 'https://github.com/aws-samples/eks-blueprints-add-ons.git',
            path: 'chart',
            targetRevision: "eks-blueprints-cdk",
        },
        bootstrapValues: {
            spec: {
                kmsKey: kmsKey.keyArn
            }
        },
        workloadApplications: [
            {
                name: "micro-services",
                namespace: "argocd",
                repository: {
                    repoUrl: 'https://github.com/aws-samples/eks-blueprints-workloads.git',
                    path: 'envs/dev',
                    targetRevision: "main",
                },
                values: {
                    domain: ""
                }
            }
        ],
        values: {
            configs: {
                secret: {
                    argocdServerAdminPassword: bcrypt.hash("argopwd1", 10)
                }
            }
        }
    });
}

function createKarpenterAddOn(clusterName: string) {
    return new bp.addons.KarpenterAddOn({
        version: 'v0.33.1',
        nodePoolSpec: {
            labels: {
                type: "karpenter-test"
            },
            annotations: {
                "eks-blueprints/owner": "young",
            },
            taints: [{
                key: "workload",
                value: "test",
                effect: "NoSchedule",
            }],
            requirements: [
                { key: 'node.kubernetes.io/instance-type', operator: 'In', values: ['m5.large'] },
                { key: 'topology.kubernetes.io/zone', operator: 'In', values: ['us-west-2a', 'us-west-2b', 'us-west-2c'] },
                { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64', 'arm64'] },
                { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['on-demand'] },
            ],
            disruption: {
                consolidationPolicy: "WhenEmpty",
                consolidateAfter: "30s",
                expireAfter: "20m",
                //budgets: [{ nodes: "10%" }]
            }
        },
        ec2NodeClassSpec: {
            amiFamily: "AL2",
            subnetSelectorTerms: [{ tags: { "Name": `${clusterName}/${clusterName}-vpc/PrivateSubnet*` }}],
            securityGroupSelectorTerms: [{ tags: { "aws:eks:cluster-name": `${clusterName}` }}],
        },
        interruptionHandling: true,
        podIdentity: false, // Recommended, otherwise, set false (as default) to use IRSA
    });
}

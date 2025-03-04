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
    .clusterProvider(new bp.FargateClusterProvider({...publicCluster}))
    .build(app, "fargate-blueprint");

/**
 * Example managed node group cluster with launch template tags that propagate all the way to the EC2 instances.
 */
const mng = builder()
    .clusterProvider(new bp.MngClusterProvider({
        ...publicCluster, 

        launchTemplate: {
            requireImdsv2: true, 
            tags: {
                "cost-center": "2122", 
                "old-cost-center": "2322",
                "new-cost-center": "2422",
                "upgrade-cost-center": "444"
            }
        },
        
    }))
    .addOns(new bp.addons.VpcCniAddOn())
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

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as bp from '../lib';
import * as bcrypt from 'bcrypt';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';

const app = new cdk.App();

const base = bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .resourceProvider(bp.GlobalResources.Vpc, new bp.VpcProvider("default")); // saving time on VPC creation


const builder = () => base.clone();

const publicCluster = {
    version: KubernetesVersion.V1_24, 
    vpcSubnets: [{ subnetType: ec2.SubnetType.PUBLIC }]
};

builder()
    .clusterProvider(new bp.FargateClusterProvider(publicCluster))
    .build(app, "fargate-blueprint");

builder()
    .clusterProvider(new bp.MngClusterProvider(publicCluster))
    .build(app, "mng-blueprint");

builder()
    .clusterProvider(new bp.MngClusterProvider(publicCluster))
    .addOns(buildArgoBootstrap())
    .build(app, 'argo-blueprint1');


function buildArgoBootstrap() {
    return new bp.addons.ArgoCDAddOn({
        bootstrapRepo: {
            repoUrl: 'https://github.com/aws-samples/eks-blueprints-add-ons.git',
            path: 'chart',
            targetRevision: "eks-blueprints-cdk",
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


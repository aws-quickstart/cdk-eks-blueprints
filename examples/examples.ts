import * as cdk from 'aws-cdk-lib';
import * as bp from '../lib';
import * as bcrypt from 'bcrypt';

const app = new cdk.App();

const base = bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .resourceProvider(bp.GlobalResources.Vpc, new bp.VpcProvider("default")); // saving time on VPC creation


const builder = base.clone;

builder()
    .clusterProvider(new bp.FargateClusterProvider())
    .build(app, "fargate-blueprint");

builder()
    .clusterProvider(new bp.MngClusterProvider())
    .build(app, "mng-blueprint");


const argoBootstrap = new bp.addons.ArgoCDAddOn({
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


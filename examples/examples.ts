import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms  from 'aws-cdk-lib/aws-kms';
import * as bp from '../lib';
import * as bcrypt from 'bcrypt';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import cluster from 'cluster';

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


class RedSgProvider implements bp.ResourceProvider<ec2.SecurityGroup> {
    provide(context: bp.ResourceContext): ec2.SecurityGroup {
        const vpc = context.get(bp.GlobalResources.Vpc) as ec2.IVpc;
        const sg =  new ec2.SecurityGroup(context.scope, "red-sg", { vpc, securityGroupName: "red-sg", allowAllOutbound: false });
        sg.addIngressRule(sg, ec2.Port.allTraffic());
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(10250));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(53));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(53));
        return sg;
    }
}

const publicCluster = {
    version: KubernetesVersion.V1_29, 
    vpcSubnets: [{ subnetType: ec2.SubnetType.PUBLIC }]
};


class SecurityGroupComplianceAddon implements bp.ClusterAddOn {
    deploy(clusterInfo: bp.ClusterInfo): void {
        const sg = ec2.SecurityGroup.fromSecurityGroupId(clusterInfo.cluster, 'ClusterSecurityGroupCompId', clusterInfo.cluster.clusterSecurityGroupId, {
            allowAllOutbound : false
        });
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(10250));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(53));
        sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(53));
        new cdk.CfnOutput(clusterInfo.cluster.stack, 'clusterSg', { value: sg.securityGroupId });
    }
}

builder()
    .clusterProvider(new bp.FargateClusterProvider(publicCluster))
    .build(app, "fargate-blueprint");

const blueprint = bp.EksBlueprint.builder()
    .account(process.env.CDK_DEFAULT_ACCOUNT)
    .region(process.env.CDK_DEFAULT_REGION)
    .version("auto")
    .addOns(new bp.AwsLoadBalancerControllerAddOn())
    .addOns(new bp.NginxAddOn())
    .addOns(new SecurityGroupComplianceAddon())
    .build(app, "mng-blueprint");

    //const sg = blueprint.getClusterInfo().cluster.clusterSecurityGroup;




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

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as blueprints from '../lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { ClusterInfo } from '../lib/spi';

/**
 * Addon that deploys two ArgoCD Applications:
 * 1. One that deploys a KRO ResourceGroupDefinition containing an ACK S3 Bucket
 * 2. One that deploys an instance of that RGD
 */
class AckS3RgdArgoAppsAddOn implements blueprints.ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const stack = cluster.stack;

        const argoCapability = clusterInfo.getCapability("argocd");
        if (!argoCapability) {
            throw new Error("AckS3RgdArgoAppsAddOn requires the ArgoCD capability to be enabled.");
        }

        // App 1: Deploys the RGD from the kro examples repo
        const rgdApp = new eks.KubernetesManifest(stack, 'argo-app-s3-rgd', {
            cluster,
            manifest: [{
                apiVersion: 'argoproj.io/v1alpha1',
                kind: 'Application',
                metadata: {
                    name: 's3-bucket-rgd',
                    namespace: 'argocd',
                },
                spec: {
                    project: 'default',
                    destination: {
                        name: 'local-cluster',
                        namespace: 'default',
                    },
                    source: {
                        repoURL: 'https://github.com/kubernetes-sigs/kro.git',
                        targetRevision: 'main',
                        path: 'examples/aws/s3bucket',
                        directory: {
                            include: 'rg.yaml',
                        },
                    },
                    syncPolicy: {
                        automated: { prune: true, selfHeal: true },
                    },
                },
            }],
        });
        const argoCrdReady = new eks.KubernetesObjectValue(stack, 'argo-crd-ready', {
            cluster,
            objectType: 'customresourcedefinitions.apiextensions.k8s.io',
            objectName: 'applications.argoproj.io',
            jsonPath: '.metadata.name',
            timeout: cdk.Duration.minutes(15),
        });
        argoCrdReady.node.addDependency(argoCapability);
        rgdApp.node.addDependency(argoCrdReady);

        // App 2: Deploys an instance of the RGD
        const instanceApp = new eks.KubernetesManifest(stack, 'argo-app-s3-instance', {
            cluster,
            manifest: [{
                apiVersion: 'argoproj.io/v1alpha1',
                kind: 'Application',
                metadata: {
                    name: 's3-bucket-instance',
                    namespace: 'argocd',
                },
                spec: {
                    project: 'default',
                    destination: {
                        name: 'local-cluster',
                        namespace: 'default',
                    },
                    source: {
                        repoURL: 'https://github.com/kubernetes-sigs/kro.git',
                        targetRevision: 'main',
                        path: 'examples/aws/s3bucket',
                        directory: {
                            include: 'instance.yaml',
                        },
                    },
                    syncPolicy: {
                        automated: { prune: true, selfHeal: true },
                    },
                },
            }],
        });
        instanceApp.node.addDependency(rgdApp);

        return Promise.resolve(instanceApp);
    }
}

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

// Must have identity center set up for ArgoCD Capability
const identityCenterArn = process.env.AWS_IDENTITY_CENTER_ARN;
const idcRegion = process.env.AWS_IDENTITY_CENTER_REGION;
const identityCenterUserId = process.env.AWS_IDENTITY_CENTER_USER_ID;

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.EksPodIdentityAgentAddOn(),
    new AckS3RgdArgoAppsAddOn(),
];

const clusterProvider = new blueprints.GenericClusterProvider({
    authenticationMode: eks.AuthenticationMode.API_AND_CONFIG_MAP,
    managedNodeGroups: [{
        id: "capabilities-node-group",
        instanceTypes: [new ec2.InstanceType("m5.large")],
        amiType: eks.NodegroupAmiType.AL2023_X86_64_STANDARD,
    }]
});

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .clusterProvider(clusterProvider)
    .capabilities({
        ack: new blueprints.capabilities.AckCapability({
            roleSelectors: [
                new blueprints.AckRoleSelectorBuilder("s3-role").withManagedPolicy("AmazonS3FullAccess").namespaces("default")]
        }),
        argocd: new blueprints.capabilities.ArgoCapability({
            idcInstanceArn: identityCenterArn!,
            idcRegion: idcRegion,
            roleMappings: {
                adminUsers: [identityCenterUserId!],
            },
            registerLocalCluster: true,
            additionalAccessPolicies: [eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {accessScopeType: eks.AccessScopeType.CLUSTER})]
        }),
        kro: new blueprints.capabilities.KroCapability({
            additionalAccessPolicies: [eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {accessScopeType: eks.AccessScopeType.CLUSTER})]
        }),
    })
    .addOns(...addOns)
    .version("auto")
    .build(app, 'capabilities-debug-stack');

void stack; // Keep for debugging

# Observability Builder

The `ObservabilityBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up observability on an existing EKS cluster or a new EKS cluster.

## Supported Methods
 
`ObservabilityBuilder` supports following methods for setting up observability on Amazon EKS :

- `addNativeObservabilityBuilderAddOns`: This method helps you prepare a blueprint for setting up observability with AWS native services
- `addOpenSourceObservabilityBuilderAddOns`: This method helps you prepare a blueprint for setting up observability with AWS managed open source services
- `addMixedObservabilityBuilderAddOns`: This method helps you prepare a blueprint for setting up observability with a combination of AWS native and AWS managed open source services

## Usage 

The framework provides a couple of convenience methods to instantiate the `` by leveraging the SDK API calls.

### Usage 1 - Observability For a New EKS Cluster

The below usage helps you with a demonstration to use `ObservabilityBuilder` to setup required addons as you prepare a blueprint for setting up observability on a new EKS cluster.

```typescript
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { ObservabilityBuilder } from '@aws-quickstart/eks-blueprints';

export default class SingleNewEksConstruct {
    constructor(scope: Construct, id: string) {
        const stackId = `${id}-observability-accelerator`;

        const account = process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;
        
        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.CloudWatchLogsAddon({
                logGroupPrefix: `/aws/eks/${stackId}`,
                logRetentionDays: 30
            }),
            new blueprints.addons.ContainerInsightsAddOn(),
            new blueprints.addons.XrayAddOn()
        ];

        ObservabilityBuilder.builder()
            .account(account)
            .region(region)
            .addNativeObservabilityBuilderAddOns()
            .addOns(...addOns)
            .build(scope, stackId);
    }
}

```

### Usage 2 - Observability For an existing EKS Cluster

The below usage helps you with a demonstration to use `ObservabilityBuilder` to setup required addons as you prepare a blueprint for setting up observability on an existing EKS cluster.

```typescript
import { ImportClusterProvider, utils } from '@aws-quickstart/eks-blueprints';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { cloudWatchDeploymentMode } from '@aws-quickstart/eks-blueprints';
import { ObservabilityBuilder } from '@aws-quickstart/eks-blueprints';
import * as cdk from "aws-cdk-lib";
import * as eks from 'aws-cdk-lib/aws-eks';

export default class ExistingEksMixedobservabilityConstruct {
    async buildAsync(scope: cdk.App, id: string) {
        // AddOns for the cluster
        const stackId = `${id}-observability-accelerator`;

        const clusterName = utils.valueFromContext(scope, "existing.cluster.name", undefined);
        const kubectlRoleName = utils.valueFromContext(scope, "existing.kubectl.rolename", undefined);

        const account = process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;
        
        const sdkCluster = await blueprints.describeCluster(clusterName, region); // get cluster information using EKS APIs
        const vpcId = sdkCluster.resourcesVpcConfig?.vpcId;

        /**
         * Assumes the supplied role is registered in the target cluster for kubectl access.
         */

        const importClusterProvider = new ImportClusterProvider({
            clusterName: sdkCluster.name!,
            version: eks.KubernetesVersion.of(sdkCluster.version!),
            clusterEndpoint: sdkCluster.endpoint,
            openIdConnectProvider: blueprints.getResource(context =>
                new blueprints.LookupOpenIdConnectProvider(sdkCluster.identity!.oidc!.issuer!).provide(context)),
            clusterCertificateAuthorityData: sdkCluster.certificateAuthority?.data,
            kubectlRoleArn: blueprints.getResource(context => new blueprints.LookupRoleProvider(kubectlRoleName).provide(context)).roleArn,
            clusterSecurityGroupId: sdkCluster.resourcesVpcConfig?.clusterSecurityGroupId
        });

        const cloudWatchAdotAddOn = new blueprints.addons.CloudWatchAdotAddOn({
            deploymentMode: cloudWatchDeploymentMode.DEPLOYMENT,
            namespace: 'default',
            name: 'adot-collector-cloudwatch',
            metricsNameSelectors: ['apiserver_request_.*', 'container_memory_.*', 'container_threads', 'otelcol_process_.*'],
        });
        
        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.CloudWatchLogsAddon({
                logGroupPrefix: `/aws/eks/${stackId}`,
                logRetentionDays: 30
            }),
            new blueprints.addons.AdotCollectorAddOn(),
            cloudWatchAdotAddOn,
            new blueprints.addons.XrayAdotAddOn(),
        ];

        ObservabilityBuilder.builder()
            .account(account)
            .region(region)
            .addMixedObservabilityBuilderAddOns()
            .clusterProvider(importClusterProvider)
            .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(vpcId)) 
            .addOns(...addOns)
            .build(scope, stackId);
    }
}
```
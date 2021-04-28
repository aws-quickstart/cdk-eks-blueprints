#!/usr/bin/env node
import { InstanceType, IVpc } from '@aws-cdk/aws-ec2';
import { Cluster, FargateProfileOptions, KubernetesVersion, MachineImageType, NodegroupAmiType } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import { AppMeshAddon } from '../lib/addons/appmesh/appMeshAddon';
import { ArgoCDAddOn } from '../lib/addons/argocd/argoCDAddon';
import { CalicoNetworkPolicyAddon } from '../lib/addons/calico/calicoAddon';
import { ContainerInsightsAddOn } from '../lib/addons/cloudwatch/containerInsightsAddon';
import { ClusterAutoScaler } from '../lib/addons/cluster-autoscaler/clusterAutoscalerAddon';
import { MetricsServerAddon } from '../lib/addons/metrics-server/metricsServerAddon';
import { NginxAddon } from '../lib/addons/nginx/nginxAddon';
import { EC2ClusterProvider, EC2ProviderClusterProps } from '../lib/ec2-cluster-provider';
import { CdkEksBlueprintStack, ClusterAddOn, ClusterInfo, ClusterProvider, TeamSetup } from '../lib/eksBlueprintStack';
import { FargateClusterProvider } from '../lib/fargate-cluster-provider';
import { PipelineStack } from '../lib/pipelineStack';
import { TeamBurnhamSetup } from '../lib/teams/team-burnham/setup';
import { TeamRikerSetup } from '../lib/teams/team-riker/setup';
import { TeamTroiSetup } from '../lib/teams/team-troi/setup';

const app = new cdk.App();

const addOns: Array<ClusterAddOn> = [
    new CalicoNetworkPolicyAddon,
    new MetricsServerAddon,
    new ClusterAutoScaler,
    new ContainerInsightsAddOn,
    new NginxAddon,
    new ArgoCDAddOn
];

const allTeams: Array<TeamSetup> = [
    new TeamTroiSetup,
    new TeamRikerSetup,
    new TeamBurnhamSetup
];

new PipelineStack(app, "factory-pipeline", {
    env: {
        account: "929819487611",
        region: 'us-east-2'
    },
});

new CdkEksBlueprintStack(app, { id: 'east-dev', addOns: addOns, teams: allTeams }, {
    env: {
        region: 'us-east-2'
    },
});

new CdkEksBlueprintStack(app, { id: 'west-dev', addOns: addOns, teams: allTeams }, {
    env: {
        region: 'us-west-2'
    },
});

new CdkEksBlueprintStack(app, { id: 'east-test-main', addOns: [new MetricsServerAddon, new ClusterAutoScaler, new ContainerInsightsAddOn, new AppMeshAddon] }, {
    env: {
        account: '929819487611',
        region: 'us-east-1',
    },
});

const fargateProfiles: Map<string, FargateProfileOptions> = new Map([
    ["dynatrace", { selectors: [{ namespace: "dynatrace" }] }]
]);

new CdkEksBlueprintStack(app, { id: 'east-fargate-test', clusterProvider: new FargateClusterProvider(fargateProfiles) }, {
    env: {
        region: 'us-east-1'
    }
})

class BottlerocketClusterProvider implements ClusterProvider {
    createCluster(scope: cdk.Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo {

        const cluster = new Cluster(scope, scope.node.id, {
            vpc: vpc,
            clusterName: scope.node.id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: version,
        })
            ;
        const nodeGroup = cluster.addAutoScalingGroupCapacity('BottlerocketNodes', {
            instanceType: new InstanceType('t3.small'),
            minCapacity: 2,
            machineImageType: MachineImageType.BOTTLEROCKET
        });

        return { cluster: cluster, autoscalingGroup: nodeGroup, version }

    }
}

new CdkEksBlueprintStack(app, { id: 'east-br-test', clusterProvider: new BottlerocketClusterProvider }, {
    env: {
        region: 'us-east-1'
    }
})

const props: EC2ProviderClusterProps = {
    version: KubernetesVersion.V1_19,
    instanceType: new InstanceType('t3.large'),
    amiType: NodegroupAmiType.AL2_X86_64
}

const myClusterProvider = new EC2ClusterProvider(props);

new CdkEksBlueprintStack(app, { id: "test-cluster-provider", clusterProvider: myClusterProvider });
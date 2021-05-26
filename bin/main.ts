#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { InstanceType, IVpc } from '@aws-cdk/aws-ec2';
import { CapacityType, Cluster, FargateProfileOptions, KubernetesVersion, MachineImageType, NodegroupAmiType } from '@aws-cdk/aws-eks';

// Blueprint
import { EksBlueprint, ClusterAddOn, ClusterInfo, ClusterProvider } from '../lib/stacks/eks-blueprint-stack';
// AddOns
import { AddOns } from '../lib/'

// Cluster Providers
import { FargateClusterProvider } from '../lib/cluster-providers/fargate-cluster-provider';
import { EC2ClusterProvider, EC2ProviderClusterProps } from '../lib/cluster-providers/ec2-cluster-provider';

// Pipeline
import { PipelineStack } from '../lib/stacks/pipeline-stack';

// Teams
import { Team } from '../lib/teams'
import { TeamBurnhamSetup } from '../lib/teams/team-burnham/setup';
import { TeamRikerSetup } from '../lib/teams/team-riker/setup';
import { TeamTroiSetup } from '../lib/teams/team-troi/setup';
import { TeamPlatform } from '../lib/teams/team-platform/setup'

const app = new cdk.App();

const addOns: Array<ClusterAddOn> = [
    new AddOns.CalicoAddOn,
    new AddOns.MetricsServerAddOn,
    new AddOns.ClusterAutoScalerAddOn,
    new AddOns.ContainerInsightsAddOn,
    new AddOns.NginxAddOn,
    new AddOns.ArgoCDAddOn
];

const allTeams: Array<Team> = [
    new TeamTroiSetup,
    new TeamRikerSetup,
    new TeamBurnhamSetup(app),
    new TeamPlatform,
];

new PipelineStack(app, "factory-pipeline", {
    env: {
        account: "929819487611",
        region: 'us-east-2'
    },
});

new EksBlueprint(app, { id: 'east-dev', addOns: addOns, teams: allTeams }, {
    env: {
        region: 'us-east-2'
    },
});

new EksBlueprint(app, { id: 'west-dev', addOns: addOns, teams: allTeams }, {
    env: {
        region: 'us-west-1'
    },
});

new EksBlueprint(app, { id: 'east-test-main', addOns: addOns }, {
    env: {
        account: '929819487611',
        region: 'us-east-1',
    },
});

const fargateProfiles: Map<string, FargateProfileOptions> = new Map([
    ["dynatrace", { selectors: [{ namespace: "dynatrace" }] }]
]);

new EksBlueprint(app, { id: 'east-fargate-test', clusterProvider: new FargateClusterProvider(fargateProfiles) }, {
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

new EksBlueprint(app, { id: 'east-br-test', clusterProvider: new BottlerocketClusterProvider }, {
    env: {
        region: 'us-east-1'
    }
})

const props: EC2ProviderClusterProps = {
    nodeGroupCapacityType: CapacityType.SPOT,
    version: KubernetesVersion.V1_19,
    instanceTypes: [new InstanceType('t3.large')],
    amiType: NodegroupAmiType.AL2_X86_64,
    amiReleaseVersion: "1.18.9-20210504" // this will upgrade kubelet to 1.19.6
}

const myClusterProvider = new EC2ClusterProvider(props);

new EksBlueprint(app, { id: "test-cluster-provider", clusterProvider: myClusterProvider });
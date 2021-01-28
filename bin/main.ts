#!/usr/bin/env node
import { FargateProfileOptions } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import { AppMeshAddon } from '../lib/addons/appmesh/appMeshAddon';
import { ArgoCDAddOn } from '../lib/addons/argocd/argoCDAddon';
import { CalicoNetworkPolicyAddon } from '../lib/addons/calico/calicoAddon';
import { ContainerInsightsAddOn } from '../lib/addons/cloudwatch/containerInsightsAddon';
import { ClusterAutoScaler } from '../lib/addons/cluster-autoscaler/clusterAutoscalerAddon';
import { MetricsServerAddon } from '../lib/addons/metrics-server/metricsServerAddon';
import { NginxAddon } from '../lib/addons/nginx/nginxAddon';
import { CdkEksBlueprintStack, ClusterAddOn, TeamSetup } from '../lib/eksBlueprintStack';
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

new CdkEksBlueprintStack(app, {id: 'east-dev', addOns: addOns, teams: allTeams}, {
    env: {
        region: 'us-east-2'
    },
});

new CdkEksBlueprintStack(app, {id: 'west-dev', addOns: addOns, teams: allTeams }, {
    env: {
        region: 'us-west-2'
    },
});

new CdkEksBlueprintStack(app, {id: 'east-test-main', addOns: [new MetricsServerAddon, new ClusterAutoScaler, new ContainerInsightsAddOn, new AppMeshAddon]}, {
    env: {
        account: '929819487611',
        region: 'us-east-1',
    },
});

const fargateProfiles: Map<string, FargateProfileOptions> = new Map([ 
    ["dynatrace", { selectors: [ { namespace: "dynatrace" }]}]
]);

new CdkEksBlueprintStack(app, {id: 'east-fargate-test', clusterProvider : new FargateClusterProvider(fargateProfiles)}, {
    env: {
        region: 'us-east-1'
    }
})
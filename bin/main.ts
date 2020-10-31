#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ArgoCDAddOn } from '../lib/addons/argocd/argoCDAddon';
import { CalicoNetworkPolicyAddon } from '../lib/addons/calico/calicoAddon';
import { ContainerInsightsAddOn } from '../lib/addons/cloudwatch/containerInsightsAddon';
import { ClusterAutoScaler } from '../lib/addons/cluster-autoscaler/clusterAutoscalerAddon';
import { MetricsServerAddon } from '../lib/addons/metrics-server/metricsServerAddon';
import { NginxAddon } from '../lib/addons/nginx/nginxAddon';
import { CdkEksBlueprintStack, ClusterAddOn, TeamSetup } from '../lib/eksBlueprintStack';
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

new CdkEksBlueprintStack(app, 'east-dev', addOns, allTeams, {
    env: {
        region: 'us-east-2'
    },
});

new CdkEksBlueprintStack(app, 'west-dev', addOns, allTeams, {
    env: {
        region: 'us-west-2'
    },
});
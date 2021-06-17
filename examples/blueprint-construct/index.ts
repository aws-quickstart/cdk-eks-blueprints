import * as cdk from '@aws-cdk/core';

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        super(scope, id);

        // Setup platform team.
        const accountID = props.env.account
        const platformTeam = new team.TeamPlatform(accountID)

        // Teams for the cluster.
        const teams: Array<ssp.Teams.Team> = [
            platformTeam,
            new team.TeamTroi,
            new team.TeamRiker,
            new team.TeamBurnham(scope)
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.AddOns.NginxAddOn,
            new ssp.AddOns.ArgoCDAddOn,
            new ssp.AddOns.CalicoAddOn,
            new ssp.AddOns.MetricsServerAddOn,
            new ssp.AddOns.ClusterAutoScalerAddOn,
            new ssp.AddOns.ContainerInsightsAddOn,
            new ssp.AddOns.AwsLoadBalancerControllerAddOn()
        ];

        new ssp.Stacks.EksBlueprint(scope, { id, addOns, teams }, props)
    }
}



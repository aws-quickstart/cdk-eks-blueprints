import * as cdk from '@aws-cdk/core';
import { NodegroupAmiType, KubernetesVersion, CapacityType } from '@aws-cdk/aws-eks';
import { InstanceType } from "@aws-cdk/aws-ec2";

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, policyDirList: Array<string>, props: cdk.StackProps) {
        super(scope, id);

        // Setup platform team.
        const account = props.env!.account!
        const platformTeam = new team.TeamPlatform(account)

        // Teams for the cluster.
        const teams: Array<ssp.teams.Team> = [
            platformTeam,
            new team.TeamTroi,
            new team.TeamRiker(scope, policyDirList[0]),
            new team.TeamBurnham(scope, policyDirList[1])
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.addons.AppMeshAddOn,
            new ssp.addons.NginxAddOn,
            new ssp.addons.ArgoCDAddOn,
            new ssp.addons.CalicoAddOn,
            new ssp.addons.MetricsServerAddOn,
            new ssp.addons.ClusterAutoScalerAddOn,
            new ssp.addons.ContainerInsightsAddOn,
            new ssp.addons.AwsLoadBalancerControllerAddOn(),
            new ssp.addons.SSMAgentAddOn()
        ];

        const blueprintID = `${id}-dev`
        new ssp.EksBlueprint(scope, { id: blueprintID, addOns, teams }, props)
    }
}

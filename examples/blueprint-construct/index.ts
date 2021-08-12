import * as cdk from '@aws-cdk/core';

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

// Team directories for network policy.
const burnhamManifestDir = './examples/teams/team-burnham/'
const rikerManifestDir = './examples/teams/team-riker/'
const teamManifestDirList = [burnhamManifestDir,rikerManifestDir]

export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        super(scope, id);

        // Setup platform team.
        const account = props.env!.account!
        const platformTeam = new team.TeamPlatform(account)

        // Teams for the cluster.
        const teams: Array<ssp.teams.Team> = [
            platformTeam,
            new team.TeamTroi,
            new team.TeamRiker(scope, teamManifestDirList[1]),
            new team.TeamBurnham(scope, teamManifestDirList[0])
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.addons.AppMeshAddOn,
            new ssp.addons.NginxAddOn({values: {
                controller: {
                    service: {
                        annotations: {
                            "key1": "value1"
                        }
                    }
                }
            }}),
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

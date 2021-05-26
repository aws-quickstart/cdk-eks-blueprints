import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class MultiRegionStack extends cdk.Stack {
    constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
        super(app, id, props);

        // Teams for the cluster.
        const teams: Array<ssp.Team> = [
            new team.TeamPlatform,
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddon,
            new ssp.ArgoCDAddon,
            new ssp.CalicoAddon,
            new ssp.MetricsServerAddon,
            new ssp.ClusterAutoScalerAddon,
            new ssp.ContainerInsightsAddOn,
        ];

        const east = 'us-east-2'
        new ssp.EksBlueprint(app, { id: `${id}-${east}`, addOns, teams }, {
            env: { region: east }
        });

        const central = 'us-central-2'
        new ssp.EksBlueprint(app, { id: `${id}-${central}`, addOns, teams }, {
            env: { region: central }
        });

        const west = 'us-west-2'
        new ssp.EksBlueprint(app, { id: `${id}-${west}`, addOns, teams }, {
            env: { region: west }
        });
    }
}

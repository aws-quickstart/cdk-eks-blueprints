import * as cdk from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class MultiTeamStack extends cdk.Stack {
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

        // TODO - what is with dynatrace?
        const fargateProfiles: Map<string, eks.FargateProfileOptions> = new Map([
            ["dynatrace", { selectors: [{ namespace: "dynatrace" }] }]
        ]);

        const clusterProvider = new ssp.FargateClusterProvider(fargateProfiles)
        new ssp.EksBlueprint(app, { id: 'east-fargate-test', clusterProvider }, {
            env: {
                region: 'us-east-1'
            }
        })
    }
}



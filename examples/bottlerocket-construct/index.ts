import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class BottlerocketConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        // Setup platform team
        const accountID = props?.env?.account
        const region = props?.env?.region
        const platformTeam = new team.TeamPlatform(<string>accountID)
        const teams: Array<ssp.Team> = [platformTeam];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];

        const stackID = `${id}-blueprint`
        const clusterProvider = new ssp.BottlerocketClusterProvider()
        new ssp.EksBlueprint(scope, { id: stackID, teams, addOns, clusterProvider }, {
            env: {
                region: region
            }
        })
    }
}



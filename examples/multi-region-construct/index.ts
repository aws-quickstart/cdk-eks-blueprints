import * as cdk from '@aws-cdk/core'

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

import { valueFromContext } from '../../lib/utils/context-utils'

export default class MultiRegionConstruct extends cdk.Construct {


    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id)

        // Setup platform team
        const accountID = props?.env?.account
        const platformTeam = new team.TeamPlatform(<string> accountID)
        const teams: Array<ssp.Team> = [platformTeam];

        const region2 =  'multi_region_1'
        const region3 =  'multi_region_2'

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];

        const firstRegion = props?.env?.region
        new ssp.EksBlueprint(scope, { id: `${id}-${firstRegion}`, addOns, teams }, {
            env: { region: firstRegion }
        });

        const secondRegion  = valueFromContext(scope, region2, null)
            new ssp.EksBlueprint(scope, { id: `${id}-${secondRegion}`, addOns, teams }, {
            env: { region: secondRegion }
        });

        const thirdRegion  = valueFromContext(scope, region3, null)
        new ssp.EksBlueprint(scope, { id: `${id}-${thirdRegion}`, addOns, teams }, {
            env: { region: thirdRegion }
        });
    }
}

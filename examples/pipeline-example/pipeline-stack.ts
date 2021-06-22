import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '../../lib'

import Pipeline from './pipeline'

// Team implementations
import * as team from '../teams'

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)

        const pipeline = Pipeline.build({
            name: 'blueprint-pipeline',
            owner: 'aws-quickstart',
            repo: 'eks-ssp-refrence-solution',
            branch: 'main',
            secretKey: '',
            scope: scope
        })

        // Dev cluster
        const dev = new ClusterStage(this, 'blueprint-dev')
        pipeline.addApplicationStage(dev);

        // Test cluster
        const test = new ClusterStage(this, 'blueprint-test')
        pipeline.addApplicationStage(test);

        // Prod cluster
        const prod = new ClusterStage(this, 'blueprint-prod')
        pipeline.addApplicationStage(prod, { manualApprovals: true });
    }
}

export class ClusterStage extends cdk.Stage {
    constructor(scope: cdk.Stack, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // Setup platform team
        const accountID = props?.env?.account
        const platformTeam = new team.TeamPlatform(accountID!)
        const teams: Array<ssp.Team> = [platformTeam];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];
        new ssp.EksBlueprint(this, { id: 'eks', addOns, teams }, props);
    }
}

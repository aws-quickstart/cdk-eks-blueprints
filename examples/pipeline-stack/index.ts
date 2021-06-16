import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, _props?: cdk.StackProps) {
        super(scope, id)

        const pipeline = this.buildPipeline(this)

        // Dev cluster.
        const stage1 = new ClusterStage(this, 'blueprint-dev')
        pipeline.addApplicationStage(stage1);

        // Staging cluster
        const stage2 = new ClusterStage(this, 'blueprint-staging')
        pipeline.addApplicationStage(stage2);

        // Production cluster
        const stageOpts = { manualApprovals: true }
        const stage3 = new ClusterStage(this, 'blueprint-production')
        pipeline.addApplicationStage(stage3, stageOpts);
    }

    private buildPipeline = (scope: cdk.Construct) => {
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const sourceAction = new actions.GitHubSourceAction({
            actionName: 'GitHub',
            owner: 'aws-quickstart',
            repo: 'quickstart-ssp-amazon-eks',
            branch: 'main',
            output: sourceArtifact,
            oauthToken: cdk.SecretValue.secretsManager('github-token'),
        })

        // Use this if you need a build step (if you're not using ts-node
        // or if you have TypeScript Lambdas that need to be compiled).
        const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            buildCommand: 'npm run build',
        })

        return new pipelines.CdkPipeline(scope, 'FactoryPipeline', {
            pipelineName: 'FactoryPipeline',
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });
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
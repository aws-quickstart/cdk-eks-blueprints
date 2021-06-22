import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

class Pipeline {
    public static build = (scope: cdk.App) => {
        // Github action.
        const sourceArtifact = new codepipeline.Artifact();
        const oathToken = cdk.SecretValue.secretsManager('github-token')
        const sourceAction = new actions.GitHubSourceAction({
            actionName: `pipeline-github-action`,
            owner: 'aws-quickstarts',
            repo: 'quickstart-ssp-amazon-eks',
            branch: 'main',
            output: sourceArtifact,
            oauthToken: oathToken,
        })

        // Synth action.
        const cloudAssemblyArtifact = new codepipeline.Artifact();
        const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            buildCommand: 'npm run build',
        })

        return new pipelines.CdkPipeline(scope, 'blueprint-pipeline', {
            pipelineName: 'blueprint-pipeline',
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

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)

        const pipeline = Pipeline.build(scope)
        const dev = new ClusterStage(this, 'blueprint-cluster-stage')
        pipeline.addApplicationStage(dev);
    }
}
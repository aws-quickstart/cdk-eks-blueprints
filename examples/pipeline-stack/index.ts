import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class PipelineStack extends cdk.Stack {
    constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
        super(app, id, props);

        const pipeline = this.buildPipeline()

        // Dev cluster.
        pipeline.addApplicationStage(new ClusterStage(this, 'dev', {
            env: {
                region: 'us-east-2'
            }
        }));

        // Staging cluster
        pipeline.addApplicationStage(new ClusterStage(this, 'staging', {
            env: {
                region: 'us-east-2'
            }
        }));

        // Production cluster
        pipeline.addApplicationStage(new ClusterStage(this, 'production', {
            env: {
                region: 'us-east-2'
            }
        }));
    }

    private buildPipeline = () => {
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        return new pipelines.CdkPipeline(this, 'FactoryPipeline', {
            pipelineName: 'FactoryPipeline',
            cloudAssemblyArtifact,

            sourceAction: new actions.GitHubSourceAction({
                actionName: 'GitHub',
                owner: 'aws-quickstart',
                repo: 'quickstart-ssp-amazon-eks',
                branch: 'main',
                output: sourceArtifact,
                oauthToken: cdk.SecretValue.secretsManager('github-token'),
            }),

            // Use this if you need a build step (if you're not using ts-node
            // or if you have TypeScript Lambdas that need to be compiled).
            synthAction: pipelines.SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,
                buildCommand: 'npm run build',
            }),
        });
    }
}

export class ClusterStage extends cdk.Stage {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

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

        new ssp.EksBlueprint(this, { id: 'eks', addOns, teams });
    }
}
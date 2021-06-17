import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

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

export default class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)

        // Dev cluster
        this.buildPipeline('dev', scope)

        // Test cluster
        this.buildPipeline('test', scope)

        // Prod cluster
        const stageOpts = { manualApprovals: true }
        this.buildPipeline('dev', scope, stageOpts)
    }

    private buildPipeline = (env: string, scope: cdk.Construct, opts?: pipelines.AddStageOptions) => {
        const pipelineProps = {
            name: `${env}-pipeline`,
            owner: 'aws-quickstart',
            repo: 'quickstart-ssp-amazon-eks',
            branch: `${env}`,
            secretId: 'github-token',
            scope
        }
        const devPipeline = GitHubPipeline.build(pipelineProps)
        const stage = new ClusterStage(this, `blueprint-${env}`)
        devPipeline.addApplicationStage(stage, opts);
    }
}

type PipelineProps = {

    name: string

    owner: string

    repo: string

    branch: string

    secretId: string

    scope: cdk.Construct
}

/**
 * GitHubPipeline
 */
export class GitHubPipeline {

    /**
     * Builds a new GitHubPipeline.
     * @param props Props for the pipeline.
     * @returns A CdkPipeline instance.
     */
    public static build = (props: PipelineProps) => {
        const sourceArtifact = new codepipeline.Artifact();
        const sourceAction = new actions.GitHubSourceAction({
            actionName: 'GitHub',
            owner: props.owner,
            repo: props.repo,
            branch: props.branch,
            output: sourceArtifact,
            oauthToken: cdk.SecretValue.secretsManager(props.secretId),
        })

        const cloudAssemblyArtifact = new codepipeline.Artifact();
        const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            buildCommand: 'npm run build',
        })

        return new pipelines.CdkPipeline(props.scope, props.name, {
            pipelineName: props.name,
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });
    }
}
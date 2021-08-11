import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

/**
 * Props for the Pipeline.
 */
export type PipelineProps = {
    /**
     * The name for the pipeline.
     */
    name: string

    /**
     * The owner of the repository for the pipeline (GitHub handle).
     */
    owner: string

    /**
     * The name of the repository for the pipeline.
     */
    repo: string

    /**
     * The branch for the pipeline.
     */
    branch: string

    /**
     * Secret key for GitHub OAuth credentials (stored in SecretsManager).
     */
    secretKey?: string

    /**
     * The CDK scope for the pipeline.
     */
    scope: cdk.Construct
}


export class CodePipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)
    }
}

/**
 * CodePipeline deploys a new CodePipeline resource that is integrated with a GitHub repository.
 */
export class CodePipeline {

    public static build = (props: PipelineProps) => {
        const sourceArtifact = new codepipeline.Artifact();
        const oathToken = cdk.SecretValue.secretsManager(props.secretKey || '')
        const sourceAction = new actions.GitHubSourceAction({
            actionName: `${props.name}-github-action`,
            owner: props.owner,
            repo: props.repo,
            branch: props.branch,
            output: sourceArtifact,
            oauthToken: oathToken,
        })

        const cloudAssemblyArtifact = new codepipeline.Artifact();
        const synthAction = new pipelines.SimpleSynthAction({
            sourceArtifact,
            cloudAssemblyArtifact,
            installCommands: [
                // Upgrade NPM to v7.
                'npm install --global npm',
                // Install deps
                'npm install',
                // Install global CDK.
                'npm install -g aws-cdk@1.116.0'
            ],
            buildCommands: ['npm run build'],
            synthCommand: 'cdk synth'
        })

        return new pipelines.CdkPipeline(props.scope, props.name, {
            pipelineName: props.name,
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });
    }
}

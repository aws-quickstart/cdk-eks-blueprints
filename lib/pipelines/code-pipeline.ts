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

/**
 * CodePipeline deploys a new CodePipeline resource.
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

        // Use this if you need a build step (if you're not using ts-node
        // or if you have TypeScript Lambdas that need to be compiled).
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

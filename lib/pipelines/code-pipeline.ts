import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, StackProps } from '@aws-cdk/core';
import { ApplicationRepository, StackBuilder } from '../spi';
import { StageProps } from '@aws-cdk/aws-codepipeline';
import { AddStageOptions } from '@aws-cdk/pipelines';


/**
 * credentialsType is excluded and the only supported credentialsSecret is a plaintext GitHub OAuth token.
 */
export type GitHubSourceRepository = Omit<ApplicationRepository, "credentialsType">;

/**
 * Props for the Pipeline.
 */
export type PipelineProps = {
    
    /**
     * The name for the pipeline.
     */
    name: string;

    /**
     * The owner of the repository for the pipeline (GitHub handle).
     */
    owner: string;

    /**
     * Repository for the pipeline
     */
    repository: GitHubSourceRepository;

    stages: [ {
        id: string,
        stackBuilder: StackBuilder,
        stageProps?: AddStageOptions
    }]
    
}


export class PipelineStack extends cdk.Stack {
    constructor(scope: Construct, pipelineProps: PipelineProps, id: string,  props: StackProps) {
        super(scope, id, props);
        const pipeline  = CodePipeline.build(scope, pipelineProps);
        for(let stage of pipelineProps.stages) {
            pipeline.addApplicationStage(new ApplicationStage(this, stage.id, stage.stackBuilder), stage.stageProps);
        }
    }
}


export class ApplicationStage extends cdk.Stage {
    constructor(scope: cdk.Stack, id: string, builder: StackBuilder, props?: cdk.StageProps) {
        super(scope, id, props);
        builder.build(scope, id, props);
    }
}

/**
 * CodePipeline deploys a new CodePipeline resource that is integrated with a GitHub repository.
 */
class CodePipeline {
    public static build(scope: Construct, props: PipelineProps) {
        const sourceArtifact = new codepipeline.Artifact();
        const oathToken = cdk.SecretValue.secretsManager(props.repository.credentialsSecretName || '')
        const sourceAction = new actions.GitHubSourceAction({
            actionName: `${props.name}-github-action`,
            owner: props.owner,
            repo: props.repository.repoUrl,
            branch: props.repository.branch,
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

        return new pipelines.CdkPipeline(scope, props.name, {
            pipelineName: props.name,
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });
    }
}

import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, StackProps } from '@aws-cdk/core';
import { ApplicationRepository, StackBuilder } from '../spi';
import { AddStageOptions } from '@aws-cdk/pipelines';
import { withUsageTracking } from '../utils/usage-utils'; 


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

    /**
     * Pipeline stages and options.
     */
    stages: StackStage[];
}

/**
 * Stack stage is a builder construct to allow adding stages to a pipeline. Each stage is expected to produce a stack. 
 */
export interface StackStage {
    /**
     * id of the stage
     */
    id: string;

    /**
     * Builder that can produce a stack which will be deployed as part of the stage
     */
    stackBuilder: StackBuilder;

    /**
     * Optional stage properties, such as {manualApprovals: true} which can control stage transitions.
     */
    stageProps?: AddStageOptions
}

export class PipelineBuilder implements StackBuilder {

    private props: Partial<PipelineProps>;


    constructor() {
        this.props = { stages: []};
    }

    public name(name: string): PipelineBuilder {
        this.props.name = name;
        return this;
    }

    public owner(owner: string) : PipelineBuilder {
        this.props.owner = owner;
        return this;
    }

    public repository(repo: GitHubSourceRepository): PipelineBuilder {
        this.props.repository = repo;
        return this;
    }

    public stage(stackStage: StackStage) : PipelineBuilder {
        this.props.stages?.push(stackStage);
        return this;
    }
    
    build(scope: cdk.Construct, id: string, stackProps?: cdk.StackProps): cdk.Stack {
        console.assert(this.props.name && this.props.owner && this.props.repository!.credentialsSecretName && this.props.stages, 
            "Please populate name, owner, repository (including credentialsSecretName) and stage fields with values for the pipeline stack");
        const fullProps = this.props as PipelineProps;
        return new PipelineStack(scope, fullProps, id, stackProps);
    }
}

/**
 * Pipeline stack is generating a self-mutating pipeline to faciliate full CI/CD experience with the platform 
 * for infrastructure changes.
 */
export class PipelineStack extends cdk.Stack {

    static readonly USAGE_ID = "qs-1s1r465k6";

    static builder() {
        return new PipelineBuilder();
    }

    constructor(scope: Construct, pipelineProps: PipelineProps, id: string,  props?: StackProps) {
        super(scope, id, withUsageTracking(PipelineStack.USAGE_ID, props));
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


export class CodePipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)
    }
}

/**
 * CodePipeline deploys a new CodePipeline resource that is integrated with a GitHub repository.
 */
class CodePipeline {
    public static build(scope: Construct, props: PipelineProps) {
        const sourceArtifact = new codepipeline.Artifact();
        const oauthToken = cdk.SecretValue.secretsManager(props.repository.credentialsSecretName!);
        const sourceAction = new actions.GitHubSourceAction({
            actionName: `${props.name}-github-action`,
            owner: props.owner,
            repo: props.repository.repoUrl,
            branch: props.repository.branch,
            output: sourceArtifact,
            oauthToken: oauthToken
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

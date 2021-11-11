import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';
import * as cdk from '@aws-cdk/core';
import { Construct, StackProps } from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import { ApplicationRepository, AsyncStackBuilder, StackBuilder } from '../spi';
import { withUsageTracking } from '../utils/usage-utils';


/**
 * credentialsType is excluded and the only supported credentialsSecret is a plaintext GitHub OAuth token.
 * repoUrl 
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
    stageProps?: pipelines.AddStageOptions;
}

/**
 * Builder for CodePipeline.
 */
export class CodePipelineBuilder implements StackBuilder {

    private props: Partial<PipelineProps>;


    constructor() {
        this.props = { stages: []};
    }

    public name(name: string): CodePipelineBuilder {
        this.props.name = name;
        return this;
    }

    public owner(owner: string) : CodePipelineBuilder {
        this.props.owner = owner;
        return this;
    }

    public repository(repo: GitHubSourceRepository): CodePipelineBuilder {
        this.props.repository = repo;
        return this;
    }

    public stage(stackStage: StackStage) : CodePipelineBuilder {
        this.props.stages?.push(stackStage);
        return this;
    }
    
    build(scope: cdk.Construct, id: string, stackProps?: cdk.StackProps): cdk.Stack {
        console.assert(this.props.name, "name field is required for the pipeline stack. Please provide value.");
        console.assert(this.props.owner,"owner field is required for the pipeline stack Please provide value.");
        console.assert(this.props.repository!.credentialsSecretName, "repository.credentialsSecretName is required for the pipeline stack. Please provide value.");
        console.assert(this.props.stages, "Stage field is required for the pipeline stack. Please provide value.");
        const fullProps = this.props as PipelineProps;
        return new CodePipelineStack(scope, fullProps, id, stackProps);
    }
}

/**
 * Pipeline stack is generating a self-mutating pipeline to faciliate full CI/CD experience with the platform 
 * for infrastructure changes.
 */
export class CodePipelineStack extends cdk.Stack {

    static readonly USAGE_ID = "qs-1s1r465k6";

    static builder() {
        return new CodePipelineBuilder();
    }

    constructor(scope: Construct, pipelineProps: PipelineProps, id: string,  props?: StackProps) {
        super(scope, id, withUsageTracking(CodePipelineStack.USAGE_ID, props));
        const pipeline  = CodePipeline.build(this, pipelineProps);

        const promises : Promise<ApplicationStage>[] = [];

        for(let stage of pipelineProps.stages) {
            const appStage = new ApplicationStage(this, stage.id, stage.stackBuilder);
            promises.push(appStage.waitForAsyncTasks());
        }

        Promise.all(promises).then(stages => {
            for(let i in stages) {
                pipeline.addApplicationStage(stages[i], pipelineProps.stages[i].stageProps);
            }
        });
    }
}


export class ApplicationStage extends cdk.Stage {

    private asyncTask: Promise<any>;

    constructor(scope: cdk.Stack, id: string, builder: StackBuilder | AsyncStackBuilder, props?: cdk.StageProps) {
        super(scope, id, props);
        if((<AsyncStackBuilder>builder).buildAsync !== undefined) {
            this.asyncTask = (<AsyncStackBuilder>builder).buildAsync(this, `${id}-blueprint`, props);
        }
        else {
            builder.build(this, `${id}-blueprint`, props);
        }
    }

    public async waitForAsyncTasks() : Promise<ApplicationStage> {
        if(this.asyncTask) {
            return this.asyncTask.then(()=> {
                return this;
            });
        }
        return Promise.resolve(this);
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
            branch: props.repository.branch ?? 'main',
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
                'npm install -g aws-cdk@1.124.0', 
                // Install deps
                'npm install',
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

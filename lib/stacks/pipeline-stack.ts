import { Construct, SecretValue, Stack, StackProps, Stage, StageProps } from "@aws-cdk/core";
import { CdkEksBlueprintStack } from "./eksBlueprintStack";
import { CdkPipeline, SimpleSynthAction } from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

export class FactoryApplication extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const eksBlueprintStack = new CdkEksBlueprintStack(this, { id: 'eks' });
    }
}

export class PipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const pipeline = new CdkPipeline(this, 'FactoryPipeline', {
            pipelineName: 'FactoryPipeline',
            cloudAssemblyArtifact,

            sourceAction: new actions.GitHubSourceAction({
                actionName: 'GitHub',
                output: sourceArtifact,
                oauthToken: SecretValue.secretsManager('github-token'),
                // Replace these with your actual GitHub project name
                owner: 'shapirov103',
                repo: 'cdk-eks-blueprint',
                branch: 'main', // default: 'master'
            }),

            synthAction: SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,
                // Use this if you need a build step (if you're not using ts-node
                // or if you have TypeScript Lambdas that need to be compiled).
                buildCommand: 'npm run build',
            }),
        });

        // Do this as many times as necessary with any account and region
        // Account and region may different from the pipeline's.
        pipeline.addApplicationStage(new FactoryApplication(this, 'dev', {
            env: {
                account: "929819487611",
                region: 'us-east-2'
            }
        }));
        // Do this as many times as necessary with any account and region
        // Account and region may different from the pipeline's.
        pipeline.addApplicationStage(new FactoryApplication(this, 'staging', {
            env: {
                account: "929819487611",
                region: 'us-east-2'
            }
        }));
    }
}
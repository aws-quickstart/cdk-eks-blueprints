### CI/CD

While it may be conveninet to leveage the CDK command line tool to deploy your first cluster, we reccomend setting up automated pipelines that will be responsible for deploying and updating your EKS based infrastructure. 

To accomplish this, the EKS SSP - Refernce Solution leverages the [`CDK Pipelines`](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html) module. This module makes it trivial to create Continuous Delivery pipelines via CodePipeline that are responsible for deploying and updating your infrastructure. 

Aditionally, the the EKS SSP - Refernce Solution leverage out of the box GitHub integration that the `CDK Pipelines` module provides in order to integrate our pipelines with Git. The end result is that any new configuration we push to the GitHub repository containing our CDK will be automatically deployed.

## Building our Pipeline

### Create a GitHub Source Action

We want all pushes to our git repo to kick of our pipeline. So the first thing we want to do is great a GitHub action.

```javascript
const sourceArtifact = new codepipeline.Artifact();
const sourceAction = new actions.GitHubSourceAction({
    actionName: 'GitHub',
    output: sourceArtifact,
    owner: '<REPO_OWNER>',
    repo: '<REPO_NAME>',
    branch: '<REPO_BRANCH>',
    oauthToken: cdk.SecretValue.plainText('GITHUB_TOKEN'),
})
```

### Create Synth Action

Next, we need to create a build step that will build any synth all new CDK code in our CD pipeline. We can do so via the following:

```javascript
const cloudAssemblyArtifact = new codepipeline.Artifact();
const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
    sourceArtifact,
    cloudAssemblyArtifact,
    buildCommand: 'npm run build',
})
```

### Create the pipeline.

Last, we create the actual pipeline with the above actions. 

```javascript
new pipelines.CdkPipeline(scope, 'FactoryPipeline', {
    pipelineName: 'FactoryPipeline',
    cloudAssemblyArtifact,
    sourceAction,
    synthAction,
});
```

### Putting it all together.

We can combine the above code into a single function which build our pipeline.

```javascript
const buildPipeline = (scope: cdk.Stack) => {
    const sourceArtifact = new codepipeline.Artifact();
    const sourceAction = new actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        owner: '<REPO_OWNER>',
        repo: '<REPO_NAME>',
        branch: '<REPO_BRANCH>',
        oauthToken: cdk.SecretValue.plainText('GITHUB_TOKEN'),
    })

    // Use this if you need a build step (if you're not using ts-node
    // or if you have TypeScript Lambdas that need to be compiled).
    const cloudAssemblyArtifact = new codepipeline.Artifact();
    const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        buildCommand: 'npm run build',
    })

   return new pipelines.CdkPipeline(scope, 'FactoryPipeline', {
        pipelineName: 'FactoryPipeline',
        cloudAssemblyArtifact,
        sourceAction,
        synthAction,
    });
}
```

## Adding Cluster Stages

In order to leverage our pipeline to deploy a CDK stack, we need to add a pipeline stage. To create a stage, we can create a class which extends `cdk.Stage` and put our blueprint stack implementation in the class.

```javascript
export class BlueprintStage extends cdk.Stage {
    constructor(scope: cdk.Stack, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // Setup platform team
        const accountID = process.env.CDK_DEFAULT_ACCOUNT!
        const platformTeam = new AdminTeam(accountID!)
        const teams: Array<ssp.Team> = [platformTeam];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            // new ssp.ContainerInsightsAddOn,
        ];
        new ssp.EksBlueprint(this, { id: 'eks', addOns, teams }, props);
    }
}
```

Then we can simply add application stages via the following.

```javascript
const pipeline = this.buildPipeline(this)

const stage1 = new ClusterStage(this, 'blueprint-dev')
pipeline.addApplicationStage(stage1);
```

We can add additional stages for additional clusters.

```javascript
// Staging cluster
const stage2 = new ClusterStage(this, 'blueprint-staging')
pipeline.addApplicationStage(stage2);

// Production cluster
const stageOpts = { manualApprovals: true }
const stage3 = new ClusterStage(this, 'blueprint-production')
pipeline.addApplicationStage(stage3, stageOpts);
```

##  Complete Implementation

We can combine all of the above into a single file that can be deployed as a stack.

```javascript
import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
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
        const cloudAssemblyArtifact = new codepipeline.Artifact();
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
```
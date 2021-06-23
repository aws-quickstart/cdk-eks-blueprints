# CI/CD

While it is conveninet to leveage the CDK command line tool to deploy your first cluster, we reccomend setting up automated pipelines that will be responsible for deploying and updating your EKS infrastructure. 

To accomplish this, the EKS SSP - Refernce Solution leverages the [`Pipelines`](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html) CDK module. This module makes it trivial to create Continuous Delivery (CD) pipelines via CodePipeline that are responsible for deploying and updating your infrastructure. 

Aditionally, the the EKS SSP - Refernce Solution leverages the GitHub integration that the `Pipelines` CDK module provides in order to integrate our pipelines with GitHub. The end result is that any new configuration pushed to a GitHub repository containing our CDK will be automatically deployed.

## Creating a pipeline

We can create a new `CodePipeline` resource via the following. 

```typescript
import * as ssp from '@shapirov/cdk-eks-blueprint'

const pipeline = ssp.CodePipeline.build({
    name: 'blueprint-pipeline',
    owner: '<REPO_OWNER>',
    repo: '<REPO_NAME>',
    branch: 'main',
    secretKey: '<SECRET_KEY>',
    scope: scope
})
```

## Creating stages 

Once our pipeline is created, we need to a `stage` for the pipeline. To do so, we can wrap our `EksBlueprint` stack in a `cdk.Stage` object.  

```typescript
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
        new ssp.EksBlueprint(this, { id: 'blueprint-cluster', addOns, teams }, props);
    }
}
```

## Adding stages to the pipeline. 

Once a stage is created, we simply add it to the pipeline. 

```typescript
const dev = new ClusterStage(this, 'blueprint-stage-dev')
pipeline.addApplicationStage(dev);
```

Adding stages to deploy multiple pipelines is trivial. 

```typescript
const dev = new ClusterStage(this, 'blueprint-stage-dev')
pipeline.addApplicationStage(dev);

const test = new ClusterStage(this, 'blueprint-stage-test')
pipeline.addApplicationStage(test);
```

We can also add manual approvals for production stages. 

```typescript
const prod = new ClusterStage(this, 'blueprint-stage-prod', {mannualApprovals: true})
pipeline.addApplicationStage(prod);
```

## Putting it all together

The below code block contains the complete implemenation of a CodePipeline that is responsible for deploying three different clusters across three different pipeline stages. 

```typescript
import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '@shapirov/cdk-eks-blueprint'

// Team implementations
import * as team from 'path/to/teams'

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id)

        const pipeline = ssp.CodePipeline.build({
            name: 'blueprint-pipeline',
            owner: '<REPO_OWNER>',
            repo: '<REPO_NAME>',
            branch: 'main',
            secretKey: '<SECRET_KEY>',
            scope: scope
        })

        const dev = new ClusterStage(this, 'blueprint-stage-dev')
        pipeline.addApplicationStage(dev);

        const test = new ClusterStage(this, 'blueprint-stage-test')
        pipeline.addApplicationStage(test);  

        // Manual approvals for Prod deploys.
        const prod = new ClusterStage(this, 'blueprint-stage-prod')
        pipeline.addApplicationStage(prod, { manualApprovals: true }));
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
        new ssp.EksBlueprint(this, { id: 'blueprint-cluster', addOns, teams }, props);
    }
}
```

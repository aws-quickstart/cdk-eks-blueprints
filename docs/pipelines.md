# Pipelines

While it is convenient to use the CDK CLI to deploy your first cluster, we recommend setting up automated pipelines that deploy and update your Amazon EKS infrastructure. To accomplish this, use the [CDK Pipelines](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html) CDK module, which uses AWS CodePipeline to create CI/CD pipelines that help to manage your infrastructure. 

Additionally, SSP uses a GitHub integration that the pipelines CDK module provides in order to integrate CI/CD pipelines with GitHub. The result is that new configurations pushed to a GitHub repository that contain the CDK are automatically deployed.

## Creating a pipeline

Create a new `CodePipeline` resource using the following code: 

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

After you create a pipeline, define a stage for it by wrapping the `EksBlueprint` stack in a `cdk.Stage` object.  

```typescript
import * as ssp from '@shapirov/cdk-eks-blueprint'

import * as team from 'path/to/teams'

export class ClusterStage extends cdk.Stage {
    constructor(scope: cdk.Stack, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // Setup platform team
        const accountID = props?.env?.account
        const platformTeam = new team.TeamPlatform(accountID!)
        const teams: Array<ssp.Team> = [platformTeam];

        // Add-ons for the cluster.
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

## Adding stages to the pipeline 

Add a stage to your pipeline using the following commands: 

```typescript
const dev = new ClusterStage(this, 'blueprint-stage-dev')
pipeline.addApplicationStage(dev);
```

Add stages to deploy multiple pipelines:

```typescript
const dev = new ClusterStage(this, 'blueprint-stage-dev')
pipeline.addApplicationStage(dev);

const test = new ClusterStage(this, 'blueprint-stage-test')
pipeline.addApplicationStage(test);
```

Add manual approvals for production stages: 

```typescript
const prod = new ClusterStage(this, 'blueprint-stage-prod')
pipeline.addApplicationStage(prod, {manualApprovals: true});
```

## Putting it all together

The following code block contains an AWS CodePipeline implementation that uses three pipeline stages to deploy three clusters across three accounts: 

```typescript
import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '@shapirov/cdk-eks-blueprint'

// Team implementations
import * as team from 'path/to/teams'

export class PipelineStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id)

        const pipeline = this.buildPipeline(scope)

        const dev = new ClusterStage(this, 'dev-stage', {
            env: {
                account: 'XXXXXXXXXXX',
                region: 'us-west-1',
            }
        })
        pipeline.addApplicationStage(dev)

        const test = new ClusterStage(this, 'test-stage', {
            env: {
                account: 'XXXXXXXXXXX',
                region: 'us-west-1',
            }
        )
        pipeline.addApplicationStage(test)  

        // Manual approvals for Prod deploys.
        const prod = new ClusterStage(this, 'prod-stage',{
            env: {
                account: 'XXXXXXXXXXX',
                region: 'us-west-1',
            }
        })
        pipeline.addApplicationStage(prod, { manualApprovals: true })
    }

    buildPipeline = (scope: cdk.Stack) => {
        return ssp.CodePipeline.build({
            name: 'blueprint-pipeline',
            owner: '<REPO_OWNER>',
            repo: '<REPO_NAME>',
            branch: 'main',
            secretKey: '<SECRET_KEY>',
            scope: scope
        })
    }
}

export class ClusterStage extends cdk.Stage {
    constructor(scope: cdk.Stack, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // Setup platform team
        const accountID = props?.env?.account
        const platformTeam = new team.TeamPlatform(accountID!)
        const teams: Array<ssp.Team> = [platformTeam];

        // Add-ons for the cluster.
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

# Pipelines

While it is convenient to leverage the CDK command line tool to deploy your first cluster, we recommend setting up automated pipelines that will be responsible for deploying and updating your EKS infrastructure.

To accomplish this, the EKS Blueprints - Reference Solution leverages the [`Pipelines`](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html) CDK module. This module makes it trivial to create Continuous Delivery (CD) pipelines via CodePipeline that are responsible for deploying and updating your infrastructure.

Additionally, the EKS Blueprints - Reference Solution leverages the GitHub integration that the `Pipelines` CDK module provides in order to integrate our pipelines with GitHub. The end result is that any new configuration pushed to a GitHub repository containing our CDK will be automatically deployed.

## Defining your blueprint to use with pipeline

Pipeline support requires enabling a setting for *modern* stack synthesis. This setting should be enabled for blueprints that leverage CDKv1 explicitly, for CDKv2 it is enabled by default.

Creation of a pipeline starts with defining the blueprint that will be deployed across the pipeline stages.

The framework allows defining a blueprint builder without instantiating the stack.

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints'
import * as team from 'path/to/teams'

const blueprint = blueprints.EksBlueprint.builder()
    .account(account) // the supplied default will fail, but build and synth will pass
    .region('us-west-1')
    .version("auto")
    .addOns(
        new blueprints.AwsLoadBalancerControllerAddOn,
        new blueprints.ExternalDnsAddOn,
        new blueprints.NginxAddOn,
        new blueprints.CalicoAddOn,
        new blueprints.MetricsServerAddOn,
        new blueprints.ClusterAutoScalerAddOn,
        new blueprints.ContainerInsightsAddOn)
    .teams(new team.TeamRikerSetup);
```

The difference between the above code and a normal way of instantiating the stack is lack of `.build()` at the end of the blueprint definition.
This code will produce a blueprint builder that can be instantiated inside the pipeline stages.

## Creating a pipeline

We can create a new `CodePipeline` resource via the following.

### Using GitHub as CodePipeline repository source.

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints'

const blueprint = blueprints.EksBlueprint.builder()
    ...; // configure your blueprint builder

 blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .repository({
        owner: "aws-samples",
        repoUrl: 'cdk-eks-blueprints-patterns',
        credentialsSecretName: 'github-token',
        targetRevision: 'main' // optional, default is "main",
    })
```

If you IaC code is located under a specific folder, for example `PROJECT_ROOT/infra/blueprints` you can specify that directory with the repository (applies to GitHub. CodeCommit and CodeStar repos). 

```
 blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .repository({
        owner: "aws-samples",
        repoUrl: 'cdk-eks-blueprints-patterns',
        credentialsSecretName: 'github-token',
        path: "./infra/blueprints" // optional, default is './'
    })```

Note: the above code depends on the AWS secret `github-token` defined in the target account/region. The secret may be defined in one main region, and replicated to all target regions.

### Using AWS CodeCommit as CodePipeline repository source.

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints'

const blueprint = blueprints.EksBlueprint.builder()
    ...; // configure your blueprint builder

 blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .repository({
        codeCommitRepoName: 'cdk-eks-blueprints-patterns', // should be in the same region with pipeline-stack
        targetRevision: 'master' // optional, default is "master"
    })
```

### Using AWS CodeStar connection as CodePipeline repository source.

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints'

const blueprint = blueprints.EksBlueprint.builder()
    ...; // configure your blueprint builder

 blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .codeBuildPolicies(blueprints.DEFAULT_BUILD_POLICIES)
    .owner('aws-samples')
    .repository({
        repoUrl: 'blueprints-repo-codestar', // repository name 
        codeStarConnectionArn: 'fill-in-codestar-arn', // CodeStar connection ARN
        targetRevision: 'main', // optional, default is "main"
    })
```

## Creating stages

Once our pipeline is created, we need to define `stages` for the pipeline. To do so, we can leverage `blueprints.StackStage` convenience class and builder support for it. Let's continue leveraging the pipeline builder defined in the previous step.

```typescript
const blueprint = blueprints.EksBlueprint.builder()
    ...; // configure your blueprint builder

blueprints.CodePipelineStack.builder()
    .name("blueprints-eks-pipeline")
    .owner("aws-samples")
    .repository({
        //  your repo info
    })
    .stage({
        id: 'us-west-1-managed-blueprints-test',
        stackBuilder: blueprint.clone('us-west-1') // clone the blueprint to customize for the stage. You can add more add-ons, teams here.
    })
    .stage({
        id: 'us-east-2-managed-blueprints-prod',
        stackBuilder: blueprint.clone('us-east-2'), // clone the blueprint to customize for the stage. You can add more add-ons, team, here.
        stageProps: {
            manualApprovals: true
        }
    })
```

Consider adding `ArgoCDAddOn` with your specific workload bootstrap repository to automatically bootstrap workloads in the provisioned clusters.
See [Bootstrapping](./addons/argo-cd.md#Bootstrapping) for more details.

## Adding Waves

In many case, when enterprises configure their SDLC environments, such as dev/test/staging/prod, each environment may contain more than a single cluster.
It is convenient to provision and maintain (update/upgrade) such clusters in parallel within the limits of the environment. Such environments may be represented as waves of the pipeline. The wave concept is not limited to just a logical environment. It may represent any grouping of clusters that should be executed in parallel. An important advantage of running stages in parallel is the time gain associated with it. Each stage may potentially take tens of minutes (e.g. initial provisioning, upgrade, etc.) and as the number of clusters increase, the overall pipeline run may become very lengthy and won't provide enough agility for the enterprise. Running parallel stages within a wave provides roughly the time performance equivalent to a single stage.

Pipeline functionality provides wave support to express waves with blueprints. You can mix individual stages and waves together. An individual stage can be viewed as a wave with a single stage.

```typescript
blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .owner("aws-samples")
    .repository({
        //...
    })
    .stage({
        id: 'us-west-1-managed-blueprints',
        stackBuilder: blueprint.clone('us-west-1')
    })
    .wave( {  // adding two clusters for dev env
        id: "dev",
        stages: [
            { id: "dev-west-1", stackBuilder: blueprint.clone('us-west-1').account(DEV_ACCOUNT)}, // requires trust relationship with the code pipeline role
            { id: "dev-east-2", stackBuilder: blueprint.clone('us-east-2').account(DEV_ACCOUNT)}, // See https://docs.aws.amazon.com/cdk/api/v1/docs/pipelines-readme.html#cdk-environment-bootstrapping

        ]
    })
    .wave( {
        id: "prod",
        stages: [
            { id: "prod-west-1", stackBuilder: blueprint.clone('us-west-1')},
            { id: "prod-east-2", stackBuilder: blueprint.clone('us-east-2')},
        ]
    })
```

## Handling Build Time Access

CodePipeline leverages CodeBuild to build artifacts. During build time, add-ons may require various look-ups. For example, the add-on or stack may look up VPC, subnets, certificates, hosted zones as well as secrets. 

By default, such look-ups at build time are restricted by the CodeBuild role created by the pipeline dynamically. That means that builds that require look-ups will fail with access denied exception. 

Customers can configure the IAM policies used by the CodeBuild as part of the pipeline execution. The framework provides a convenience default build policies `blueprints.DEFAULT_BUILD_POLICIES` that enable look-ups (including secret look-ups).

Example with default policies:

```typescript
const pipeline = blueprints.CodePipelineStack.builder()
            .name("blueprints-pipeline-with-build-roles")
            .owner('aws-samples')
            .codeBuildPolicies(blueprints.DEFAULT_BUILD_POLICIES)
```

Example with customer supplied policies:

```typescript
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const pipeline = blueprints.CodePipelineStack.builder()
            .name("blueprints-pipeline-inaction")
            .owner('your-owner')
            .codeBuildPolicies([ 
                new PolicyStatement({
                    resources: [mySecretArn],
                    actions: [    
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret",
                    ]
                })
            ])
            .build(...)
```

## Monorepo support

In some cases, customers choose to have their blueprints defined in subdirectories on a monorepo project. In this scenario, the root of the project is not the root of the CDK pipeline. A single monorepo can also support multiple subprojects each containing its own pipeline. 

To support this case, customers can specify the relative path of the subdirectory containing the blueprints. 

Example pipeline with inline explanation:

```ts
const blueprint = ...; // define your blueprint

blueprints.CodePipelineStack.builder()
    .application("npx ts-node bin/main.ts") // optionally set application to point to the launch file. In this case bin/main.ts is located in the path set in the repo configuration  - examples/monorepo/bin/main.ts. Useful when multiple apps are defined. 
    .name("blueprints-eks-pipeline")
    .owner("aws-quickstart")
    .codeBuildPolicies(blueprints.DEFAULT_BUILD_POLICIES)
    .repository({
        repoUrl: 'cdk-eks-blueprints',
        credentialsSecretName: 'github-token',
        targetRevision: 'bug/broken-monorepo-pipelines',
        path: "examples/monorepo", // set the path relative to the root of the monrepo
        trigger: blueprints.GitHubTrigger.POLL // optionally set trigger, by default it will create a webhook.
    })
    .stage({
        id: 'us-west-2-sandbox',
        stackBuilder: blueprint.clone('us-west-2')
    })
    .build(app, "pipeline", { env: { region, account }});
```

## Build the pipeline stack

Now that we have defined the blueprint builder, the pipeline with repository and stages we just need to invoke the build() step to create the stack.

```typescript
const blueprint = blueprints.EksBlueprint.builder()
    ...; // configure your blueprint builder

blueprints.CodePipelineStack.builder()
    .name("eks-blueprints-pipeline")
    .owner("aws-samples") // owner of your repo
    .repository({
        //  your repo info
    })
    .stage({
        id: 'dev',
        stackBuilder: blueprint.clone('us-west-1') // clone the blueprint to customize for the stage. You can add more add-ons, teams here.
    })
    .stage({
        id: 'test',
        stackBuilder: blueprint.clone('us-east-2'), // clone the blueprint to customize for the stage. You can add more add-ons, team, here.
    })
    .stage({
        id: 'prod',
        stackBuilder: blueprint.clone('us-west-2'), // clone the blueprint to customize for the stage. You can add more add-ons, team, here.
    })
    .build(scope, "blueprints-pipeline-stack", props); // will produce the self-mutating pipeline in the target region and start provisioning the defined blueprints.

```

## Deploying Pipelines

In order to deploy pipelines, each environment (account and region) where pipeline will either be running and each environment to which it will be deploying should be bootstrapped based on CodePipeline [documentation](https://docs.aws.amazon.com/cdk/api/v1/docs/pipelines-readme.html#cdk-environment-bootstrapping).

Examples of bootstrapping (from the original documentation):

To bootstrap an environment for provisioning the pipeline:

```bash
$ env CDK_NEW_BOOTSTRAP=1 npx cdk bootstrap \
    [--profile admin-profile-1] \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    aws://111111111111/us-east-1
```
To bootstrap a different environment for deploying CDK applications into using a pipeline in account 111111111111:

```bash
$ env CDK_NEW_BOOTSTRAP=1 npx cdk bootstrap \
    [--profile admin-profile-2] \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust 11111111111 \
    aws://222222222222/us-east-2
```

If you only want to trust an account to do lookups (e.g, when your CDK application has a Vpc.fromLookup() call), use the option --trust-for-lookup:

```bash
$ env CDK_NEW_BOOTSTRAP=1 npx cdk bootstrap \
    [--profile admin-profile-2] \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --trust-for-lookup 11111111111 \
    aws://222222222222/us-east-2
```

## Troubleshooting

**Problem**
Blueprints Build can fail with AccessDenied exception during build phase. Typical error messages:

```
Error: AccessDeniedException: User: arn:aws:sts::<account>:assumed-role/blueprints-pipeline-stack-blueprintsekspipelinePipelineBuildSynt-1NPFJRH6H7TB1/AWSCodeBuild-e95830ee-07f6-46f5-aaee-90e269c7eb5f is not authorized to perform:
```

```
current credentials could not be used to assume 'arn:aws:iam::<account>:role/cdk-hnb659fds-lookup-role-,account>-eu-west-3', but are for the right account. Proceeding anyway.
```
***
```
Error: you are not authorized to perform this operation.
```

This can happen for a few reasons, but most typical is  related to the stack requiring elevated permissions at build time. Such permissions may be required to perform lookups, such as look up fo VPC, Hosted Zone, Certificate (if imported) and those are handled during stack synthesis.

**Resolution**

You can take advantage of supplying the require IAM policies to the pipeline to avoid this error. See [this](#handling-build-time-access) for more details.

To address this issue "manually" (without the change to the pipeline), you can locate the role leveraged for Code Build and provide ***required permissions. Depending on the scope of the build role, the easiest resolution is to add `AdministratorAccess` permission to the build role which typically looks similar to this `blueprints-pipeline-stack-blueprintsekspipelinePipelineBuildSynt-1NPFJRH6H7TB1` provided your pipeline stack was named `blueprints-pipeline-stack`.
If adding administrative access to the role solves the issue, you can then consider tightening the role scope to just the required permissions, such as access to specific resources needed for the build.

**Problem**

Failure to create webhook for GitHub sources. When user does not admin rights to a repository or in a more narrow case does not have required permissions to create a webhook, the pipeline fails with an error message similar to this:

```
Webhook could not be registered with GitHub. Error cause: Not found [StatusCode: 404, Body: {"message":"Not Found","documentation_url":"https://docs.github.com/rest/repos/webhooks#create-a-repository-webhook"}]
```

**Resolution**

1. Option one: configure proper permissions to create webhook against the target repo.
2. Option two: modify the trigger to use POLL instead of webhook. 

For option two here is the example configuration:

```ts
blueprints.CodePipelineStack.builder()
    .name("blueprints-eks-pipeline")
    .owner(...)
    .repository({
        ...
        trigger: blueprints.GitHubTrigger.POLL // optionally set trigger to POLL, by default it will create a webhook.
    })
    ...
```
# Pipelines

While it is convenient to leverage the CDK command line tool to deploy your first cluster, we recommend setting up automated pipelines that will be responsible for deploying and updating your EKS infrastructure. 

To accomplish this, the EKS SSP - Reference Solution leverages the [`Pipelines`](https://docs.aws.amazon.com/cdk/api/latest/docs/pipelines-readme.html) CDK module. This module makes it trivial to create Continuous Delivery (CD) pipelines via CodePipeline that are responsible for deploying and updating your infrastructure. 

Additionally, the EKS SSP - Reference Solution leverages the GitHub integration that the `Pipelines` CDK module provides in order to integrate our pipelines with GitHub. The end result is that any new configuration pushed to a GitHub repository containing our CDK will be automatically deployed.

## Defining your blueprint to use with pipeline

Creation of a pipeline starts with defining the blueprint that will be deployed across the pipeline stages.

The framework allows defining a blueprint builder without instantiating the stack.

```typescript
import * as ssp from '@aws-quickstart/ssp-amazon-eks'
import * as team from 'path/to/teams'

const blueprint = ssp.EksBlueprint.builder()
    .account(account) // the supplied default will fail, but build and synth will pass
    .region('us-west-1')
    .addOns(
        new ssp.AwsLoadBalancerControllerAddOn, 
        new ssp.ExternalDnsAddOn,
        new ssp.NginxAddOn,
        new ssp.CalicoAddOn,
        new ssp.MetricsServerAddOn,
        new ssp.ClusterAutoScalerAddOn,
        new ssp.ContainerInsightsAddOn)
    .teams(new team.TeamRikerSetup);
```

The difference between the above code and a normal way of instantiating the stack is lack of `.build()` at the end of the blueprint definition.
This code will produce a blueprint builder that can be instantiated inside the pipeline stages.

## Creating a pipeline

We can create a new `CodePipeline` resource via the following. 

```typescript
import * as ssp from '@aws-quickstart/ssp-amazon-eks'

const blueprint = ssp.EksBlueprint.builder()
    ...; // configure your blueprint builder

 ssp.CodePipelineStack.builder()
    .name("ssp-eks-pipeline")
    .owner("aws-samples")
    .repository({
        repoUrl: 'ssp-eks-patterns',
        credentialsSecretName: 'github-token',
        branch: 'main'
    })
```

Note: the above code depends on the AWS secret `github-token` defined in the target account/region. The secret may be fined in one main region, and replicated to all target regions. 

## Creating stages 

Once our pipeline is created, we need to define `stages` for the pipeline. To do so, we can leverage `ssp.StackStage` convenience class and builder support for it. Let's continue leveraging the pipeline builder defined in the previous step.  

```typescript
const blueprint = ssp.EksBlueprint.builder()
    ...; // configure your blueprint builder

ssp.CodePipelineStack.builder()
    .name("ssp-eks-pipeline")
    .owner("aws-samples")
    .repository({
        //  your repo info
    }) 
    .stage({
        id: 'us-west-1-managed-ssp-test',
        stackBuilder: blueprint.clone('us-west-1') // clone the blueprint to customize for the stage. You can add more add-ons, teams here. 
    })
    .stage({
        id: 'us-east-2-managed-ssp-prod',
        stackBuilder: blueprint.clone('us-east-2'), // clone the blueprint to customize for the stage. You can add more add-ons, team, here.
        stageProps: {
            manualApprovals: true
        }
    })
```

Consider adding `ArgoCDAddOn` with your specific workload bootstrap repository to automatically bootstrap workloads in the provisioned clusters.
See [Bootstrapping](./addons/argo-cd.md#Bootstrapping) for more details.

## Build the pipeline stack

Now that we have defined the blueprint builder, the pipeline with repository and stages we just need to invoke the build() step to create the stack.

```typescript
const blueprint = ssp.EksBlueprint.builder()
    ...; // configure your blueprint builder

ssp.CodePipelineStack.builder()
    .name("ssp-eks-pipeline")
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
    .build(scope, "ssp-pipeline-stack", props); // will produce the self-mutating pipeline in the target region and start provisioning the defined blueprints.

```

## Troubleshooting

SSP Build can fail with AccessDenied exception during build phase. Typical error messages:

```
Error: AccessDeniedException: User: arn:aws:sts::<account>:assumed-role/ssp-pipeline-stack-sspekspipelinePipelineBuildSynt-1NPFJRH6H7TB1/AWSCodeBuild-e95830ee-07f6-46f5-aaee-90e269c7eb5f is not authorized to perform:
```

```
current credentials could not be used to assume 'arn:aws:iam::<account>:role/cdk-hnb659fds-lookup-role-,account>-eu-west-3', but are for the right account. Proceeding anyway.
```

```
Error: you are not authorized to perform this operation. 
```

This can happen for a few reasons, but most typical is  related to the stack requiring elevated permissions at build time. Such permissions may be required to perform lookups, such as look up fo VPC, Hosted Zone, Certificate (if imported) and those are handled during stack synthesis. 

**Resolution**

To address this issue, you can locate the role leveraged for Code Build and provide required permissions. Depending on the scope of the build role, the easiest resolution is to add `AdministratorAccess` permission to the build role which typically looks similar to this `ssp-pipeline-stack-sspekspipelinePipelineBuildSynt-1NPFJRH6H7TB1` provided your pipeline stack was named `ssp-pipeline-stack`. 
If adding administrative access to the role solves the issue, you can the consider tightening the role scope to just the required permissions, such as access to specific resources needed for the build.
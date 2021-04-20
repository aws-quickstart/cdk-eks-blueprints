# EKS Blueprint

The repository contains the source code and configuration for the `EKS Shared Services Platform` reference architecture. 

## Getting Started 

### Install CDK 

This reference architecture leverages [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/). Install CDK via the following.

```bash
npm install -g aws-cdk
```

Verify the installation.

```bash
cdk --version
```

### Project setup

Create a new CDK project. We use `typescript` for this example. 

```bash
cdk init app --language typescript
```

Bootstrap your environment. For more information see Bootstrapping below.  

```bash
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

### Usage

Add the `cdk-eks-blueprint` library as as a dependency to your CDK project. 

```json
"dependencies": {
  "@shapirov/cdk-eks-blueprint": "0.1.4"
}
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following:

```typescript
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {
    CdkEksBlueprintStack, 
    ArgoCDAddOn
    MetricsServerAddon, 
    ClusterAutoScaler, 
    ContainerInsightsAddOn, 
    NginxAddon, 
    CalicoNetworkPolicyAddon, 
}  from '@shapirov/cdk-eks-blueprint';

const addOns: Array<ClusterAddOn> = [
  new ArgoCDAddOn
  new MetricsServerAddon,
  new ClusterAutoScaler,
  new ContainerInsightsAddOn,
  new NginxAddon, 
  new CalicoNetworkPolicyAddon,
];

const app = new cdk.App();
new CdkEksBlueprintStack(app, 'east-test-1', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

Deploy the stack 

```
cdk deploy
```

### Stack Configuration

Supports context variables (specify in cdk.json, cdk.context.json or pass with -c command line option):

- `instanceType`: (defaulted to "t3.medium") Type of instance for the EKS cluster, must be a valid instance type like t3.medium
- `vpc`: Specifies whether to use an existing VPC (if specified) or create a new one if not specified.
- `minSize`: Min cluster size, must be positive integer greater than 0 (default 1).
- `maxSize`: Max cluster size, must be greater than minSize.
- `vpcSubnets`: List of VPC subnets for cluster provisioning (unsupported yet)

### Updating Clusters

// Todo - Add

### Upgrading Clusters

// Todo - Add

## Solution Details

### Shared Services Platform

A Shared Services Platform (SSP) is an interenal development platform that abstracts the complexities of cloud infrastrucuture from developers, and allows them to deploy workloads with ease. As SSP is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The SSP packages these tools into a cohesive whole and makes them available to development teams via a simplified interface, typically a CLI, GUI, Git, or, manifest file. 

### Reference Architecture goals.

The goal of this project is to provide a reference implementation of a Shared Services Platform (SSP) built on top of EKS. At present the implementation provides the following functionality:

  * **Cluster Management** - Provision one or many EKS clusters across one or many regions.
  * **Add-ons** A modular approach to configuring the clusters with suite of add-ons or plugins that are needed to run workloads in a Kubernetes environment. 
    * **Custom Add-ons** Add your own add-ons by implementing a `ClusterAddon` SPI (to be extended for lifecycle management). 
  * **Tenant Onboarding** Seamless onboarding of tenants/workloads onto specific clusters via CDK configuration and Gitops.

### Supported Addons

| AddOn             | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| `AppMeshAddon`           | Adds an AppMesh controller and CRDs (pending validation on the latest version of CDK) |
| `ArgoCDAddon`            | Adds an ArgoCD controller |
| `CalicoAddon`            | Adds the Calico 1.7.1 CNI/Network policy engine |
| `CloudWatchAddon`        | Adds Container Insights support integrating monitoring with CloudWatch |
| `ClusterAutoscalerAddon` | Adds the standard cluster autoscaler ([Karpenter](https://github.com/awslabs/karpenter) is coming)|
| `MetricsServerAddon`| Adds metrics server (pre-req for HPA and other monitoring tools)|
| `NginxAddon`        | Adds NGINX ingress controller |

### EKS Cluster Management 

// Todo - Add

### Configuring Addons 

// Todo - Add

### Creating an Addon

// Todo - Add

### Onboarding Tenants

Examples are provided under `lib/teams`, however due to uniqueness of every team, clients are expected to supply implementation of the `TeamSetup` interface.

### CI/CD

## IaC Pipeline

(work in progress)

Example of IaC self-mutating pipeline based on CodePipeline can be found in the `lib/pipelineStack.ts`.

## Bootstrapping

Each combination of target account and region must be bootstrapped prior to deploying stacks.
Bootstrapping is an process of creating IAM roles and lambda functions that can execute some of the common CDK constructs.

Example: 
```   
  cdk bootstrap aws://<AWS_ACCOUNT_ID>/us-east-1
```
In addition to the regular [environment bootstrapping](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) pipeline bootstrapping for pipelines requires a new style of bootstrapping. Execute (with account admin privileges) the command in bootstrap-pipeline.sh.  

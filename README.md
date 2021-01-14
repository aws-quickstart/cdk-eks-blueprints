# EKS Blueprint

The repository contains implementation of the CDK based EKS blueprint that can be viewed as a component of a shared services platform implementation.

At present the implementation contains the following functionality:

* Provision one or many EKS clusters with a pre-defined configuration. 
* Configure your EKS cluster (or multiple clusters) with add-ons (not to confuse with EKS Managed Addons announced at re:Invent 2020). Select from a list of available addons or add your own by implementing a `ClusterAddon` SPI (to be extended for lifecycle management). Supported addons:  
  * AppMesh Addon: adds AppMesh controller and CRDs (pending validation on the latest version of CDK)
  * ArgoCD Addon: adds ArgoCD controller 
  * Calico Addon: Calico 1.7.1 CNI/Network policy engine
  * CloudWatch: Container Insights support integrating monitoring with CloudWatch 
  * ClusterAutoscaler: addon install standard cluster autoscaler ([Karpenter](https://github.com/awslabs/karpenter) is coming)
  * MetricsServerAddon: adds metrics server (pre-req for HPA and other monitoring tools)
  * NginxAddon: installs NGINX ingress controller 
* Onboard one or many teams into designated clusters. Examples are provided under `lib/teams`, however due to uniqueness of every team, clients are expected to supply implementation of the `TeamSetup` interface.

Note: currently tested version of CDK with the blueprint is 1.76 (affects bootstrapping as well, see below). It will be migrated shortly to 1.84 (or later). 
## Bootstrapping
Each combination of target account and region must be bootstrapped prior to deploying stacks.
Bootstrapping is an process of creating IAM roles and lambda functions that can execute some of the common CDK constructs.

Example: 
```   
  cdk bootstrap aws://929819487611/us-east-1
```
In addition to the regular [environment bootstrapping](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) pipeline bootstrapping for pipelines requires a new style of bootstrapping. Execute (with account admin privileges) the command in bootstrap-pipeline.sh.  

## cdk-eks-blueprint
Supports context variables (specify in cdk.json, cdk.context.json or pass with -c command line option):

- instanceType: (defaulted to "t3.medium") Type of instance for the EKS cluster, must be a valid instance type like t3.medium
- vpc: Specifies whether to use an existing VPC (if specified) or create a new one if not specified.
- minSize: Min cluster size, must be positive integer greater than 0 (default 1).
- maxSize: Max cluster size, must be greater than minSize.
- vpcSubnets ="List of VPC subnets for cluster provisioning (unsupported yet)

## Usage

Create a new CDK project and add the following to the dependency section of the package.json file:
```
    "@shapirov/cdk-eks-blueprint": "0.1.1"
```
Note: the module name will be migrated to aws in the near future. 

In the main file (or anywhere in your classes) import CDK EKS blueprint and configure it with various modules:

```ts
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {CdkEksBlueprintStack, AppMeshAddon, ClusterAddOn, CalicoNetworkPolicyAddon, MetricsServerAddon, ClusterAutoScaler, ContainerInsightsAddOn, NginxAddon, ArgoCDAddOn}  from '@shapirov/cdk-eks-blueprint';

const addOns: Array<ClusterAddOn> = [
  new CalicoNetworkPolicyAddon,
  new MetricsServerAddon,
  new ClusterAutoScaler,
  new ContainerInsightsAddOn,
  new NginxAddon, 
  new ArgoCDAddOn
];


const app = new cdk.App();
new CdkEksBlueprintStack(app, 'east-test-1', [new MetricsServerAddon, new ClusterAutoScaler, new ContainerInsightsAddOn], [], {
  env: {
      account: YOUR_ACCOUNT,
      region: YOUR_TARGET_REGION,
  },
});
```
Please create issues to request additional addons from the AWS portfolio. Otherwise, addons could be created outside of this repository, however a PR to the README maybe helpful to reference and advertise. 

## IaC Pipeline
(work in progress)
Example of IaC self-mutating pipeline based on CodePipeline can be found in the `lib/pipelineStack.ts`.
## Useful commands (internal)

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template



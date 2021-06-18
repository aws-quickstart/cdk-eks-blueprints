# Amazon EKS SSP Quickstart

![GitHub](https://img.shields.io/github/license/shapirov103/cdk-eks-blueprint)

Welcome to the `Amazon EKS SSP Quickstart` repository.

This repository contains the source code for the [`cdk-eks-blueprint`](https://www.npmjs.com/package/@shapirov/cdk-eks-blueprint) NPM module. `cdk-eks-blueprint` is a CDK construct that makes it easy for customers to deploy a Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## What is an SSP?

A Shared Services Platform (SSP) is an internal development platform that abstracts the complexities of cloud infrastructure from developers, and allows them to deploy workloads with ease. As SSP is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The SSP packages these tools into a cohesive whole and makes them available to development teams as a service. From an operational perspective, SSPs allow companies to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure into a central platform that can then be used by developers across an enterprise.

## What can I do with this QuickStart?

Customers can use `cdk-eks-blueprint` to:

* Deploy "blueprint" `EKS` clusters across multiple accounts and regions. 
* Declare the set of addons that are provisioned into each cluster. 
* Manage configuration for all of your clusters from a single Git repository.
* Define teams, namespaces, and their associated access permissions.
* Integrate cluster access with IAM or OIDC provider of your choosing. 
* Leverage GitOps-based workflows to onboard and manage workloads for your teams. 


## Documentation

For complete project documentation, please see our [official project documentation site](http://aws.amazon.com).

## Examples

To view a library of sample implementations, please see our [SSP Patterns Repository](https://github.com/shapirov103/eks-ssp-patterns).

You can also view a sample implementation in `bin/main.ts`.

## Getting Started

Install CDK matching the version of the SSP Quickstart.

```bash
npm install -g aws-cdk@1.104.0
```

Verify the installation.

```bash
cdk --version
# must output 1.104.0
```

Create a new CDK project. We use `typescript` for this example. 

```bash
cdk init app --language typescript
```

Bootstrap your environment. For more information see Bootstrapping below.  

```bash
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

### Usage

Run the following command to install the dependency in your project.

```
npm i @shapirov/cdk-eks-blueprint
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following:

```typescript
import * as cdk from '@aws-cdk/core';
import * as ssp from '@shapirov/cdk-eks-blueprint';

const app = new cdk.App();

// AddOns for the cluster.
const addOns: Array<ssp.ClusterAddOn> = [
    new ssp.addons.NginxAddOn,
    new ssp.addons.ArgoCDAddOn,
    new ssp.addons.CalicoAddOn,
    new ssp.addons.MetricsServerAddOn,
    new ssp.addons.ClusterAutoScalerAddOn,
    new ssp.addons.ContainerInsightsAddOn,
    new ssp.addons.AwsLoadBalancerControllerAddOn()
];

const account = 'XXXXXXXXXXXX'
const region = 'us-east-2'
const props = { env: { account, region } }
new ssp.Stacks.EksBlueprint(scope, { id: 'blueprint', addOns, teams }, props)
```

Run the following command to confirm there are no issues with your code

```
npm run build 
```

If there are no errors you should see the following
```
> eks-factory-test@0.1.0 build
> tsc
```

Deploy the stack using the following command

```
cdk deploy
```

### Examples 

To view more examples for how you can leverage `cdk-eks-blueprint`, see the `examples` directory.

---

## Why should I use this framework?  

SSPs can be difficult to design and build. From an operations perspective, you need to determine the right mix of tools and services you want to include in your platform and how they integrate. You also need to determine how to maintain a fleet of clusters and their associated addons across regions. From a developer perspective, you need to determine how to onboard an operate workloads on the platfrom as well. 

The `cdk-eks-blueprint` framework provides logical abstractions and perscriptive guidance for building a well-architected platform, and ultimately, will help accelerate time to market for your platform implementation.

## Feedback

For architectural details, step-by-step instructions, and customization options, see the [deployment guide](https://aws-quickstart.github.io/quickstart-ssp-amazon-eks/).

To post feedback, submit feature ideas, or report bugs, use the **Issues** section of this GitHub repo. 

To submit code for this Quick Start, see the [AWS Quick Start Contributor's Kit](https://aws-quickstart.github.io/).

## License

This library is licensed under the Apache 2.0 License.


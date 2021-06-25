# Amazon EKS SSP Quick Start

![GitHub](https://img.shields.io/github/license/aws-quickstart/quickstart-ssp-amazon-eks)

Welcome to the `Amazon EKS SSP Quickstart` repository.

This repository contains the source code for the [`cdk-eks-blueprint`](https://www.npmjs.com/package/@shapirov/cdk-eks-blueprint) NPM module. `cdk-eks-blueprint` is a [CDK](https://aws.amazon.com/cdk/) construct that makes it easy for customers to build and deploy a Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## Documentation

For complete project documentation, please see our [official project documentation site](http://aws.amazon.com).

## What is an SSP?

A Shared Services Platform (SSP) is an internal development platform that abstracts the complexities of cloud infrastructure from developers, and allows them to deploy workloads with ease. As SSP is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The SSP packages these tools into a cohesive whole and makes them available to development teams as a service. From an operational perspective, SSPs allow companies to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure into a central platform that can then be used by developers across an enterprise.

## What can I do with this QuickStart?

Customers can use this QuickStart to easily architect and deploy a multi-tenant SSP built on EKS. Specifically, customers can leverage the `cdk-eks-blueprint` module to:

- [x] Deploy Well-Architected EKS clusters across any number of accounts and regions.
- [x] Manage cluster configuration, including addons that run in each cluster, from a single Git repository.
- [x] Define teams, namespaces, and their associated access permissions for your clusters.
- [x] Create Continuous Delivery (CD) pipelines that are responsible for deploying your infrastructure.
- [x] Leverage GitOps-based workflows for onboarding and managing workloads for your teams. 

## Examples

To view a library of examples for how you can leverage the `cdk-eks-blueprint`, please see our [SSP Patterns Repository](https://github.com/shapirov103/eks-ssp-patterns).

You can also find a sample implementation that resides in this repository in `bin/main.ts`.

## Getting Started

First, make sure you have the [`aws-cli`](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed. To verify your installation, run the following: 

```bash
aws --version
# output aws-cli/2.2.3 Python/3.9.5 Darwin/20.3.0 source/x86_64 prompt/off
```

Install CDK matching the current version of the SSP QuickStart (which can be found in package.json).

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

[Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) your environment.

```bash
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

### Usage

Run the following command to install the `cdk-eks-blueprint` dependency in your project.

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
    new ssp.addons.ArgoCDAddOn,
    new ssp.addons.CalicoAddOn,
    new ssp.addons.MetricsServerAddOn,
    new ssp.addons.ContainerInsightsAddOn,
    new ssp.addons.AwsLoadBalancerControllerAddOn()
];

const account = '<YOUR_ACCOUNT_ID'
const region = 'us-east-2'
const props = { env: { account, region } }
new ssp.EksBlueprint(scope, { id: 'blueprint', addOns, teams }, props)
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

This will provision the following:

- [x] A new Well-Architected VPC with both Public and Private subnets.
- [x] A new Well-Architected EKS cluster in the region and account you specify.
- [x] [ArgoCD](https://argoproj.github.io/argo-cd/) into your cluster to support GitOps deployments. 
- [x] [Calico](https://docs.projectcalico.org/getting-started/kubernetes/) into your cluster to support Network policies.
- [x] [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) into your cluster to support metrics collection.
- [x] AWS and Kubernetes resources needed to forward logs and metrics to [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html).
- [x] AWS and Kubernetes resources needed to support [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).

---

## Why should I use this QuickStart?  

The ecosystem of tools that have developed around Kubernetes and the Cloud Native Computing Foundation (CNCF) provide cloud engineers with a wealth of choice when it comes to architecting their infrastructure. Determining the right mix of tools and services however, in addition to how they integrate, can be a challenge. As your Kubernetes estate grows, managing configuration for your clusters can also become a challenge. 

AWS customers are building internal platforms to tame this complexity, automate the management of their Kubernetes environments, and make it easy for developers to onboard their workloads. These platforms require investment of time and engineering resources to build however. The goal of this QuickStart is to provide customers with a tool chain that can help them deploy a Well-Architected platform on top of EKS with ease. The `cdk-eks-blueprint` framework provides logical abstractions and prescriptive guidance for building a platform. Ultimately, we want to help EKS customers accelerate time to market for their own platform initiatives. 

## Feedback

For architectural details, step-by-step instructions, and customization options, see our [official documentation site](https://aws-quickstart.github.io/quickstart-ssp-amazon-eks/).

To post feedback, submit feature ideas, or report bugs, use the **Issues** section of this GitHub repo. 

To submit code for this Quick Start, see the [AWS Quick Start Contributor's Kit](https://aws-quickstart.github.io/).

## License

This library is licensed under the Apache 2.0 License.


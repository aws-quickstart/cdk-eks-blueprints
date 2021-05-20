# Amazon EKS SSP Quickstart

![GitHub](https://img.shields.io/github/license/shapirov103/cdk-eks-blueprint)

Welcome to the `Amazon EKS SSP Quickstart` repository.

For architectural details, step-by-step instructions, and customization options, see the [deployment guide](https://aws-quickstart.github.io/quickstart-ssp-amazon-eks/).

To post feedback, submit feature ideas, or report bugs, use the **Issues** section of this GitHub repo. 

To submit code for this Quick Start, see the [AWS Quick Start Contributor's Kit](https://aws-quickstart.github.io/).

## Overview 

This repository contains the source code for the `amazon-eks-ssp` NPM module. `amazon-eks-ssp` is a framework and methodology that makes it easy for customers build Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## What is an SSP?

A Shared Services Platform (SSP) is an interenal development platform that abstracts the complexities of cloud infrastrucuture from developers, and allows them to deploy workloads with ease. As SSP is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The SSP packages these tools into a cohesive whole and makes them available to development teams as a service. From an operational perspective, SSPs allow companies to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure into a central platform that can then be used by developers across an enterprise.

## What can I do with the Quickstart?

Customers can use `Amazon EKS SSP Quickstart` to:

* Deploy batteries included `EKS` clusters across multiple accounts and regions. 
* Manage configuration for all of your cluster from a single Git repository.
* Manage the set of addons that are provisioned in each cluster. 
* Leverage Gitops-based workflows to onboard and manage workloads. 
* Define teams, namespaces, and their associated access permissions.
* Integrate cluster access with IAM or OIDC provider of your choosing.

## Documentation

For complete project documentation, please see our [offical project documentation site](http://aws.amazon.com).

## Getting Started

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
npm i @shapirov/amazon-eks-ssp
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following:

```typescript
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as ssp from '@shapirov/amazon-eks-ssp';

const addons = ssp.addons
const addOns: Array<ssp.ClusterAddOn> = [
  new addons.NginxAddon, 
  new addons.ArgoCDAddOn,
  new addons.ClusterAutoScaler,
  new addons.MetricsServerAddon,
  new addons.ContainerInsightsAddOn,
  new addons.CalicoNetworkPolicyAddon,
];

const app = new cdk.App();
new ssp.EksBlueprint(app, {id: 'east-test-1', addOns: addOns, teams: []}, {
  env: {
      account: 'XXXXXXXXXXXX',
      region: 'us-east-2'
  },
});
```

Run the following command to confirm there are no issues with our code

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
---

## Why should I use this framework?

As Kubernetes and EKS adopting grows within a customer organization, managing cluster configuration and all of the workloads/teams that run within the clusters can quickly become overwhelming. We see customers building Shared Services Platfomrs to automate this complexity and make it easier to maintain their EKS estate.  

SSPs can be difficult to design and build however. From an operations perspective, you need to determine the right mix of tools and services you want to include in your platform and how they integrate. You also need to determine how to maintain a fleet of clusters and their associated addons across regions. From a developer perspective, you need to determine how to onboard an operate workloads on the platfrom as well. 

If you are:

##### Net new to EKS

This quick start aims to jumpstart the process for customers. If you are net new to EKS, but know you want to enable multiple development teams, you can use this implementation to quickly deploy a platform and start onboarding workloads. 

##### Migrating from a PaaS

If you are migrating to EKS from an on-premise PaaS such as OpenShift or PCF, you can leveage this project to easily deploy EKS clusters and still provide your developers with a completely abstracted experience. 

##### Building your own Platform

Lastly, if you are currently building your own platform, you can use this project as a reference for your own implementation. 

## Feedback

Have feedback or a feature request? 🙏 Please submit an issue in this repository.

## License

This library is licensed under the Apache 2.0 License.



# Amazon EKS SSP Quick Start

![GitHub](https://img.shields.io/github/license/aws-quickstart/quickstart-ssp-amazon-eks)
![Build](https://codebuild.us-west-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiYVN6RlEyQmNNRVRxRWYxUkhBcStQcHFkTExZa2dtZXBWcDdqZ2lWNCtXVENOcWwzV0F0cklUOXlnVGtMZ1BzR0JLZUtHU2V3dUcwb0NOMmdxWGxKOFpVPSIsIml2UGFyYW1ldGVyU3BlYyI6IlEyWmdVeXlxMS9UOVk0QUMiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=main)

Welcome to the `Amazon EKS SSP Quickstart` repository.

This repository contains source code for the [`cdk-eks-blueprint`](https://www.npmjs.com/package/@shapirov/cdk-eks-blueprint) NPM module. The `cdk-eks-blueprint` module is a [CDK](https://aws.amazon.com/cdk/) construct for customers to build and deploy a Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## What is an SSP?

An SSP is an internal development platform that helps remove the complexities of cloud infrastructure. An SSP typically has multiple AWS or open-source products and services, including services for running containers and continuous integration and continuous delivery (CI/CD) pipelines as well as monitoring logs, metrics, and security protocols. From an operational perspective, an SSP is a set of consolidated tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure from a central platform that can then be used as a service by developers. For more information, see the [SSP Amazon EKS](https://aws-quickstart.github.io/quickstart-ssp-amazon-eks/) guide.

## SSP Quick Start

Use this Quick Start to design and deploy a multitenant SSP on top of Amazon EKS. The `cdk-eks-blueprint` module can be used for the following:

- [x] Deploy well-architected Amazon EKS clusters across accounts and Regions.
- [x] Manage cluster configurations, including add-ons that run in each cluster, from a single Git repository.
- [x] Define teams, namespaces, and their associated access permissions.
- [x] Create CD pipelines that deploy your infrastructure.
- [x] Use GitOps-based workflows for onboarding and managing workloads.

## Why should I use this Quick Start?  

The system of developer tools for Kubernetes and the Cloud Native Computing Foundation (CNCF) provides cloud engineers with a wealth of choice when it comes to designing infrastructure. Determining the right mix of tools and services, however, in addition to how they integrate, can be a challenge. As your Kubernetes projects grow, managing your cluster's configuration can also become a challenge.

AWS customers build internal platforms to reduce complexity, automate the management of Kubernetes environments, and onboard workloads. But these platforms require time investments and engineering resources to build. This Quick Start provides customers with a tool chain that can help them deploy a Well-Architected platform on top of Amazon EKS. The `cdk-eks-blueprint` framework provides logical abstractions and prescriptive guidance for building a platform. Ultimately, we want to help EKS customers accelerate time to market for their platform initiatives.

## Examples

For a library of `cdk-eks-blueprint` examples, see [SSP EKS Patterns](https://github.com/aws-samples/ssp-eks-patterns) and [EKS Shared Services Patterns](https://github.com/shapirov103/eks-ssp-patterns) (you can also find a sample implementation in `bin/main.ts`).

## Getting Started

Install [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html), and verify the installation by running the following command: 

```bash
aws --version
# output aws-cli/2.2.3 Python/3.9.5 Darwin/20.3.0 source/x86_64 prompt/off
```

Install CDK by matching it to the current version of SSP, which can be found in `package.json`:

```bash
npm install -g aws-cdk@1.113.0
```

Verify the installation:

```bash
cdk --version
# must output 1.113.0
```

Create a new CDK project. We use `typescript` in this example.

```bash
cdk init app --language typescript
```

[Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) your environment:

```bash
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

### Usage

Run the following command to install the `cdk-eks-blueprint` dependency:

```
npm i @shapirov/cdk-eks-blueprint
```

Replace the contents of `bin/<your-main-file>.ts` (by default, `your-main-file` is the name of the root project directory) with the following:

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

Run the following command to confirm there are no issues with your code:

```
npm run build 
```

If there are no errors, you should see the following output:

```
> eks-factory-test@0.1.0 build
> tsc
```

Deploy the stack using the following command:

```
cdk deploy
```

This provisions the following:

- [x] A new well-architected VPC with both public and private subnets.
- [x] A new well-architected EKS cluster in the Region and account you specify.
- [x] [Argo CD](https://argoproj.github.io/argo-cd/) to support GitOps deployments.
- [x] [Calico](https://docs.projectcalico.org/getting-started/kubernetes/) to support network policies.
- [x] [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) to support metrics collection.
- [x] AWS and Kubernetes resources to forward logs and metrics to [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html).
- [x] AWS and Kubernetes resources to support [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).

---

## Feedback

For architectural details, step-by-step instructions, and customization options, see the [depoloyment guide](https://aws-quickstart.github.io/quickstart-ssp-amazon-eks/). To post feedback, submit feature ideas, or report bugs, use the **Issues** section of the GitHub repository.

To submit code for this Quick Start, see the [AWS Quick Start Contributor's Guide](https://aws-quickstart.github.io/).

## License

The software included with this deployment is licensed under the Apache License, version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at http://aws.amazon.com/apache2.0/ or in the accompanying "license" file. This code is distributed on an as-is basis, without warranties or conditions of any kind, either expressed or implied. See the License for specific language governing permissions and limitations.
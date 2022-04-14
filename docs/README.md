
# Amazon EKS Blueprints Quick Start

![GitHub](https://img.shields.io/github/license/aws-quickstart/cdk-eks-blueprints)
![Build](https://codebuild.us-west-2.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiTWxBQzVUcTBvdSsvbE9mR0ZWeTJjbi96OUpBREorSG51UjMzQ1UyNXdmUzZ2dUJoTkhIODFJWjN2QjRGcnhWS0pYLzFQRU5uOThiUEp1WjEzS0htbUpVPSIsIml2UGFyYW1ldGVyU3BlYyI6IlRkUFRoTWtjdElBMkR5NEMiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=main)

Welcome to the `Amazon EKS Blueprints Quickstart` repository.

This repository contains the source code for the [`eks-blueprints`](https://www.npmjs.com/package/@aws-quickstart/eks-blueprints) NPM module. `eks-blueprints` is a [CDK](https://aws.amazon.com/cdk/) construct that makes it easy for customers to build and deploy internal development platforms  on top of [Amazon EKS](https://aws.amazon.com/eks/).

## Documentation

For complete project documentation, please see our [official project documentation site](https://aws-quickstart.github.io/cdk-eks-blueprints/).

## What is EKS Blueprints?

EKS Blueprints is a framework that helps customers create internal development platforms. It abstracts the complexities of cloud infrastructure from developers, and allows them to deploy workloads with ease. As EKS Blueprints is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The EKS Blueprints packages these tools into a cohesive whole and makes them available to development teams as a service. From an operational perspective, EKS Blueprints allow companies to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure into a central platform that can then be used by developers across an enterprise.

## What can I do with this QuickStart?

Customers can use this QuickStart to easily architect and deploy a multi-tenant Blueprints built on EKS. Specifically, customers can leverage the `eks-blueprints` module to:

- [x] Deploy Well-Architected EKS clusters across any number of accounts and regions.
- [x] Manage cluster configuration, including addons that run in each cluster, from a single Git repository.
- [x] Define teams, namespaces, and their associated access permissions for your clusters.
- [x] Create Continuous Delivery (CD) pipelines that are responsible for deploying your infrastructure.
- [x] Leverage GitOps-based workflows for onboarding and managing workloads for your teams.

## Examples

To view a library of examples for how you can leverage the `eks-blueprints`, please see our [Blueprints Patterns Repository](https://github.com/aws-samples/cdk-eks-blueprints-patterns).

You can also find a sample implementation that resides in this repository in `bin/main.ts`.

## Getting Started

First, make sure you have the [`aws-cli`](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) installed. To verify your installation, run the following:

```bash
aws --version
# output aws-cli/2.2.3 Python/3.9.5 Darwin/20.3.0 source/x86_64 prompt/off
```

Install CDK matching the current version of the Blueprints QuickStart (which can be found in package.json).

```bash
npm install -g aws-cdk@2.20.0
```

Verify the installation.

```bash
cdk --version
# must output 2.20.0
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

Run the following command to install the `eks-blueprints` dependency in your project.

```sh
npm i @aws-quickstart/eks-blueprints
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following:

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

// AddOns for the cluster.
const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.ArgoCDAddOn,
    new blueprints.addons.CalicoAddOn,
    new blueprints.addons.MetricsServerAddOn,
    new blueprints.addons.ClusterAutoScalerAddOn,
    new blueprints.addons.ContainerInsightsAddOn,
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new blueprints.addons.XrayAddOn()
];

const account = 'XXXXXXXXXXXXX'
const region = 'us-east-2'
const props = { env: { account, region } }
new blueprints.EksBlueprint(app, { id: 'east-test-1', addOns}, props)
```

Note: if the account/region combination used in the code example above is different from the initial combination used with `cdk bootstrap`, you will need to perform `cdk bootstrap` again to avoid error.

Please reference [CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) usage doc for detail.

Deploy the stack using the following command

```sh
cdk deploy
```

This will provision the following:

- [x] A new Well-Architected VPC with both Public and Private subnets.
- [x] A new Well-Architected EKS cluster in the region and account you specify.
- [x] [Nginx](https://kubernetes.github.io/ingress-nginx/deploy/) into your cluster to serve as a reverse proxy for your workloads. 
- [x] [ArgoCD](https://argoproj.github.io/argo-cd/) into your cluster to support GitOps deployments. 
- [x] [Calico](https://docs.projectcalico.org/getting-started/kubernetes/) into your cluster to support Network policies.
- [x] [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) into your cluster to support metrics collection.
- [x] AWS and Kubernetes resources needed to support [Cluster Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/cluster-autoscaler.html).
- [x] AWS and Kubernetes resources needed to forward logs and metrics to [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html).
- [x] AWS and Kubernetes resources needed to support [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).
- [x] [Amazon VPC CNI add-on (VpcCni)](https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html) into your cluster to support native VPC networking for Amazon EKS.
- [x] [CoreDNS Amazon EKS add-on (CoreDns)](https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html) into your cluster. CoreDns is a flexible, extensible DNS server that can serve as the Kubernetes cluster DNS
- [x] [ kube-proxy Amazon EKS add-on (KubeProxy)](https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html) into your cluster to maintains network rules on each Amazon EC2 node
- [x] AWS and Kubernetes resources needed to support [AWS X-Ray](https://aws.amazon.com/xray/).

---

## Why should I use this QuickStart?  

The ecosystem of tools that have developed around Kubernetes and the Cloud Native Computing Foundation (CNCF) provides cloud engineers with a wealth of choice when it comes to architecting their infrastructure. Determining the right mix of tools and services however, in addition to how they integrate, can be a challenge. As your Kubernetes estate grows, managing configuration for your clusters can also become a challenge.

AWS customers are building internal platforms to tame this complexity, automate the management of their Kubernetes environments, and make it easy for developers to onboard their workloads. However, these platforms require investment of time and engineering resources to build. The goal of this QuickStart is to provide customers with a tool chain that can help them deploy a Well-Architected platform on top of EKS with ease. The `eks-blueprints` framework provides logical abstractions and prescriptive guidance for building a platform. Ultimately, we want to help EKS customers accelerate time to market for their own platform initiatives.

## Feedback

For architectural details, step-by-step instructions, and customization options, see our [official documentation site](https://aws-quickstart.github.io/cdk-eks-blueprints/).

To post feedback, submit feature ideas, or report bugs, use the **Issues** section of this GitHub repo.

To submit code for this Quick Start, see the [AWS Quick Start Contributor's Kit](https://aws-quickstart.github.io/).

## License

This library is licensed under the Apache 2.0 License.

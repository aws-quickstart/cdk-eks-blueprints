# Core Concepts

This document provides a high level overview of the Core Concepts that are embedded in the `cdk-eks-blueprint` framework. It will help you gain a deeper understanding of how the framework and how it is designed.

For the purposes of this document, we will assume the reader is familiar with Git, Docker, Kubernetes and AWS. 

| Concept | Description |

## Blueprint 

The `cdk-eks-blueprint` framework allows you to configure and deploy what we call `blueprint` clusters. A `blueprint` consists of an EKS `cluster`, a set of `Add Ons` that will be deployed into a cluster, and a set of `teams` who will have access to a cluster. Once a `blueprint` is configured, it can be easily deployed across an number of AWS accounts and regions. 

## Cluster

A `cluster` is simply an EKS cluster. The `cdk-eks-blueprint` framework provides for customizing the compute options you leverage with your clusters. The framework currently supports `EC2`, `Fargate` and `BottleRocket` instances. 

To specify the type of compute you want to use for your `cluster`, you supply a `ClusterProvider` object to your `blueprint`. The framework defaults to leveraging EC2 instances.

Each `ClusterProvider` provides additional configuration options as well. For example, the `EC2ClusterProvider` allows you to configure instance types, min and max instance counts, and amiType, among other options. 

See our [`Cluster Providers`](./cluster-providers) documentation page for detailed information. 

## Add On

Addons allow you to configure the tools and services that you would like to run in order to support your EKS workloads. Addons can deploy Kubernetes specific addons, but they can also deploy AWS resources need to support Addon functionality. 

For examples, the `MetricsServerAddon` deploys Kubernetes YAML into your cluster that is needed to run the Kubernetes Metrics Server. By contrast, the `AWSLoadBalancerControllerAddon` deploys Kuberentes YAML into your cluster, in addition to creating resources via AWS API that are needed to support the AWS Load Balancer Controller. 

See our ]`AddOns`](./addons) documentation page for detailed information. 

## Team 

`Teams` allow you to configure the users that have access to your EKS clusters, in addition to the access permissions they are granted. The framework currently supports two types of `teams`: `ApplicationTeam` and `PlatformTeam`. 

`ApplicationTeam` members are granted access to specific namespaces. `PlatformTeam` members are granted administrative access to your clusters. 

See our [`Teams`](./cluster-providers) documentation page for detailed information. 

## Pipelines

`Pipelines` allow you to configure `Continuous Delivery` (CD) pipelines for your cluster `blueprints`. 

See oue [`Pipelines`](./pipelines) documentation page for detailed information. 
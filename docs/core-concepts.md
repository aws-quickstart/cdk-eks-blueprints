# Core Concepts

This document provides a high level overview of the Core Concepts that are embedded in the `cdk-eks-blueprint` framework. For the purposes of this document, we will assume the reader is familiar with Git, Docker, Kubernetes and AWS. 

| Concept       | Description                                                           |     
|---------------|-----------------------------------------------------------------------|
| [Blueprint](#blueprint) | A `blueprint` combines `clusters`, `add-ons`, and `teams` into a cohesive object that can deployed as a whole. |                             
| [Cluster](#cluster) | A Well-Architected EKS Cluster. |
| [Add-on](#add-on) |  Allow you to configure, deploy, and update the operational software, or add-ons, that provide key functionality to support your Kubernetes applications. |
| [Team](#team) | A logical grouping of IAM identities that have access to a Kubernetes namespace(s). |
| [Pipeline](#pipeline) | Continuous Delivery pipelines for deploying `clusters` and `add-ons`. |
| [Application](#application) | An application that runs within an EKS Cluster. |

## Blueprint 

The `cdk-eks-blueprint` framework allows you to configure and deploy what we call `blueprint` clusters. A `blueprint` consists of an EKS cluster, a set of `add-ons` that will be deployed into the cluster, and a set of `teams` who will have access to a cluster. Once a `blueprint` is configured, it can be easily deployed across any number of AWS accounts and regions. `Blueprints` also leverage GitOps tooling to facilitate cluster bootstrapping and workload onboarding. 

To view sample `blueprint` implementations, please see our [patterns repository](https://github.com/aws-samples/ssp-eks-patterns). 

## Cluster

A `cluster` is simply an EKS cluster. The `cdk-eks-blueprint` framework provides for customizing the compute options you leverage with your `clusters`. The framework currently supports `EC2`, `Fargate` and `BottleRocket` instances. To specify the type of compute you want to use for your `cluster`, you supply a `ClusterProvider` object to your `blueprint`. The framework defaults to leveraging the `EC2ClusterProvider`.

Each `ClusterProvider` provides additional configuration options as well. For example, the `EC2ClusterProvider` allows you to configure instance types, min and max instance counts, and amiType, among other options. 

See our [`Cluster Providers`](../cluster-providers) documentation page for detailed information. 

## Add-on

`Add-ons` allow you to configure the tools and services that you would like to run in order to support your EKS workloads. When you configure `add-ons` for a `blueprint`, the `add-ons` will be provisioned at deploy time. Add-ons can deploy both Kubernetes specific resources and AWS resources needed to support add-on functionality. 

For examples, the `MetricsServerAddon` only deploys the Kubernetes manifests that are needed to run the Kubernetes Metrics Server. By contrast, the `AWSLoadBalancerControllerAddon` deploys Kubernetes YAML, in addition to creating resources via AWS APIs that are needed to support the AWS Load Balancer Controller. 

See our [`Add-ons`](../add-ons) documentation page for detailed information. 

## Team 

`Teams` allow you to configure the logical grouping of users that have access to your EKS clusters, in addition to the access permissions they are granted. The framework currently supports two types of `teams`: `ApplicationTeam` and `PlatformTeam`. `ApplicationTeam` members are granted access to specific namespaces. `PlatformTeam` members are granted administrative access to your clusters. 

See our [`Teams`](../teams) documentation page for detailed information. 

## Pipeline

`Pipelines` allow you to configure `Continuous Delivery` (CD) pipelines for your cluster `blueprints` that are directly integrated with your Git provider.

See our [`Pipelines`](../pipelines) documentation page for detailed information. 

## Application

`Applications` represent the actual workloads that run within a Kubernetes cluster. The framework leverages a GitOps approach for deploying applications onto clusters. 

See our [`Applications](../applications) documentation for detailed information.
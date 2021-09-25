# Core Concepts

This document provides a high-level overview of the core concepts embedded in the `cdk-eks-blueprint` framework. For the purposes of this document, we assume readers are familiar with Git, Docker, Kubernetes, and AWS. 

| Concept       | Description                                                           |     
|---------------|-----------------------------------------------------------------------|
| [Blueprint](#blueprint) | A `blueprint` combines `clusters`, `add-ons`, and `teams` into a cohesive object that can be deployed as a whole. |                             
| [Cluster](#cluster) | A well-architected Amazon EKS cluster.|
| [Add-on](#add-on) |  Software add-ons that provide functional support for Kubernetes applications, such as configuring, deploying, and updating.|
| [Team](#team) | A logical grouping of IAM identities that can access a Kubernetes namespace(s).|
| [Pipeline](#pipeline) | CD pipelines for deploying clusters and add-ons.|
| [Application](#application) | An application that runs within an Amazon EKS cluster.|

## Blueprint 

Using the `cdk-eks-blueprint` framework, you can configure and deploy blueprint clusters. A blueprint consists of an Amazon EKS cluster, a set of add-ons that are deployed into the cluster, and a set of teams that have access to a cluster. When a blueprint is configured, it can be deployed across any number of AWS accounts and Regions. Blueprints also use GitOps tools to facilitate cluster bootstrapping and workload onboarding.

For an example of a blueprint implementation, see [SSP EKS Patterns](https://github.com/aws-samples/ssp-eks-patterns). 

## Cluster

In the context of this guide, a "cluster" is an Amazon EKS cluster. The `cdk-eks-blueprint` framework provides customization and compute options for your clusters. The framework supports 	Amazon Elastic Compute Cloud (Amazon EC2), AWS Fargate, and BottleRocket instances. To specify a type of compute for your cluster, provide a `ClusterProvider` object. The default framework uses `EC2ClusterProvider`.

Each `ClusterProvider` provides configuration options. For example, `EC2ClusterProvider` allows you to configure instance types, minimum and maximum instance counts, and Amazon Machine Image (AMI) type, among other options. For more information, see [Cluster providers](../cluster-providers).

## Add-ons

Add-ons allow you to configure the tools and services that support Amazon EKS workloads. When you configure add-ons for a blueprint, the add-ons are provisioned during deployment. Add-ons can deploy both Kubernetes-specific resources and AWS resources. 

For examples, `MetricsServerAddon` deploys only Kubernetes manifests that are required to run Kubernetes Metrics Server. In contrast, `AWSLoadBalancerControllerAddon` deploys Kubernetes YAML and creates resources through AWS APIs that are required to support the AWS Load Balancer Controller. For more information, see [Add-ons](../add-ons). 

## Team 

By creating teams, you can configure the logical grouping of users that have access to your EKS clusters in addition to the access permissions they have. The framework currently supports two types of teams: `ApplicationTeam` and `PlatformTeam`. `ApplicationTeam` members have access to specific namespaces, and `PlatformTeam` members have administrative access to clusters. For more information, see [Teams](../teams). 

## Pipeline

The framework uses CD pipelines for blueprints to integrate applications directly with your Git provider. For more information, see [Pipelines](../pipelines). 

## Application

Applications are workloads that run within a Kubernetes cluster. The framework uses a GitOps approach for deploying applications on clusters. For more information, see [Applications](../applications).
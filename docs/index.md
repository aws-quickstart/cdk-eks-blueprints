# Overview

Welcome to the [`Amazon EKS SSP Quick Start`](https://github.com/aws-quickstart/quickstart-ssp-amazon-eks) documentation site.

`Amazon EKS SSP Quick Start` provides AWS customers with a framework and methodology for building a Shared Services Platform (SSP) on top of [Amazon Elastic Kubernetes Service (Amazon EKS)](https://aws.amazon.com/eks/).

## What is an SSP?

An SSP is an internal development platform that removes the complexities of a cloud infrastructure. It typically has multiple AWS or open-source products and services, including services for running containers, setting up continuous delivery and continuous integration (CI/CD) pipelines, capturing logs and metrics, and enforcing security protocols. From an operational perspective, companies can use SSPs to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructures on a centralized enterprise platform.

## What can I do with this deployment?

Customers can use this deployment to set up a multitenant SSP on top of Amazon EKS. The `cdk-eks-blueprint` module provides the following benefits:

- [x] Deploys well-architected Amazon EKS clusters across accounts and Regions.
- [x] Manages cluster configurations, including add-ons that run in each cluster, from a single GitHub repository.
- [x] Defines teams, namespaces, and their associated access permissions for your clusters.
- [x] Creates CI/CD pipelines that deploy your infrastructure.
- [x] Uses GitOps-based workflows to onboard and manage your team's workloads. 

## Examples

For examples of how `cdk-eks-blueprint` is used, see [SSP EKS Patterns](https://github.com/aws-samples/ssp-eks-patterns).
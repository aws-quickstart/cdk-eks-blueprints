# Overview

Welcome to the [`Amazon EKS SSP Quick Start`](https://github.com/aws-quickstart/quickstart-ssp-amazon-eks) documentation site.

`Amazon EKS SSP Quick Start` provides AWS customers with a framework and methodology that makes it easy to build a Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## What is an SSP?

A Shared Services Platform (SSP) is an internal development platform that abstracts the complexities of cloud infrastructure from developers, and allows them to deploy workloads with ease. As SSP is typically composed of multiple AWS or open source products and services, including services for running containers, CI/CD pipelines, capturing logs/metrics, and security enforcement. The SSP packages these tools into a cohesive whole and makes them available to development teams as a service. From an operational perspective, SSPs allow companies to consolidate tools and best practices for securing, scaling, monitoring, and operating containerized infrastructure into a central platform that can then be used by developers across an enterprise.

## What can I do with this QuickStart?

Customers can use this Quick Start to easily architect and deploy a multi-tenant SSP built on EKS. Specifically, customers can leverage the `ssp-amazon-eks` module to:

- [x] Deploy Well-Architected EKS clusters across any number of accounts and regions.
- [x] Manage cluster configuration, including add-ons that run in each cluster, from a single Git repository.
- [x] Define teams, namespaces, and their associated access permissions for your clusters.
- [x] Create Continuous Delivery (CD) pipelines that are responsible for deploying your infrastructure.
- [x] Leverage GitOps-based workflows for onboarding and managing workloads for your teams. 

## Examples

To view a library of examples for how you can leverage the `ssp-amazon-eks`, please see our [SSP Patterns Repository](https://github.com/aws-samples/ssp-eks-patterns).
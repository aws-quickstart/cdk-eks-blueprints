# Overview

Welcome to the `Amazon EKS SSP Quickstart` repository.

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
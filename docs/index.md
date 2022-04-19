# Overview

Welcome to the [`Amazon EKS Blueprints Quick Start`](https://github.com/aws-quickstart/cdk-eks-blueprints) documentation site.

This repository contains the source code for the [`eks-blueprints`](https://www.npmjs.com/package/@aws-quickstart/eks-blueprints) NPM module. It can be used by AWS customers, partners, and internal AWS teams to configure and manage complete EKS clusters that are fully bootstrapped with the operational software that is needed to deploy and operate workloads. 

## What is EKS Blueprints?

EKS Blueprints helps you compose complete EKS clusters that are fully bootstrapped with the operational software that is needed to deploy and operate workloads. With EKS Blueprints, you describe the configuration for the desired state of your EKS environment, such as the control plane, worker nodes, and Kubernetes add-ons, as an IaC blueprint. Once a blueprint is configured, you can use it to stamp out consistent environments across multiple AWS accounts and Regions using continuous deployment automation.

You can use EKS Blueprints to easily bootstrap an EKS cluster with Amazon EKS add-ons as well as a wide range of popular open-source add-ons, including Prometheus, Karpenter, Nginx, Traefik, AWS Load Balancer Controller, Fluent Bit, Keda, ArgoCD, and more. EKS Blueprints also helps you implement relevant security controls needed to operate workloads from multiple teams in the same cluster.

## What can I do with this QuickStart?

Customers can use this Quick Start to easily architect and deploy a multi-tenant Blueprints built on EKS. Specifically, customers can leverage the `eks-blueprints` module to:

- [x] Deploy Well-Architected EKS clusters across any number of accounts and regions.
- [x] Manage cluster configuration, including add-ons that run in each cluster, from a single Git repository.
- [x] Define teams, namespaces, and their associated access permissions for your clusters.
- [x] Create Continuous Delivery (CD) pipelines that are responsible for deploying your infrastructure.
- [x] Leverage GitOps-based workflows for onboarding and managing workloads for your teams. 

## Examples

To view a library of examples for how you can leverage the `eks-blueprints`, please see our [Blueprints Patterns Repository](https://github.com/aws-samples/cdk-eks-blueprints-patterns).
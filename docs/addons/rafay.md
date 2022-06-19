
# Rafay Addon - AWS EKS Blueprints for CDK

EKS Blueprints for [CDK](https://aws.amazon.com/cdk/) is a framework that makes it easy for customers to configure and deploy Rafay Kubernetes Operator as part of an EKS Blueprints cluster on [Amazon EKS](https://aws.amazon.com/eks/).

This Addon deploys [Rafay’s Kubernetes Operations Platform (KOP)](https://rafay.co) for Amazon Elastic Kubernetes Service (Amazon EKS) management and operations. With KOP, your platform and site-reliability engineering (SRE) teams can deploy, operate, and manage the lifecycle of Kubernetes clusters and containerized applications in both AWS Cloud and on-premises environments.

With the Rafay Kubernetes Operations Platform, enterprises use a single operations platform to manage the lifecycle of Amazon EKS clusters and containerized applications. You can speed up the deployment of new applications to production, reduce application downtimes, and reduce security and compliance risks associated with your infrastructure.

Rafay automates the deployment of containerized applications and enables access to Kubernetes clusters through a zero-trust connectivity model. A unified dashboard provides enterprise-grade capabilities, such as monitoring across AWS Regions, role-based access control, and governance.

## Installation

Using [npm](https://npmjs.org):

```bash
npm install @rafaysystems/rafay-eks-blueprints-addon
```

For a quick tutorial on EKS Blueprints, visit the [Getting Started guide](https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/).


## Basic Usage

```typescript
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as rafayAddOn from '@rafaysystems/rafay-eks-blueprints-addon';
import { Construct } from "constructs";


export default class RafayConstruct extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const stackId = `${id}-blueprint`;

        let rafayConfig = {
            organizationName: "rafay-eks-org-1", // replace with your organization Name
            email: "abc@example.com", // replace with your email
            firstName: "John", // replace with your first Name
            lastName: "Doe", // replace with your last Name
            password: "P@$$word", // replace with a password of your own
            clusterName: "eks-cluster-1", // replace with the name that you want the cluster to be created in Rafay Console
            blueprintName: "minimal"
        } as rafayAddOn.RafayConfig

        const addOns: Array<blueprints.ClusterAddOn> = [
            new rafayAddOn.RafayClusterAddOn(rafayConfig)
        ];
         blueprints.EksBlueprint.builder()
            .account(process.env.CDK_DEFAULT_ACCOUNT!)
            .region(process.env.CDK_DEFAULT_REGION)
            .addOns(...addOns)
            .build(scope, stackId);
    }
}

```


## Validation

```
kubectl get po -n rafay-system
NAME                                     READY   STATUS    RESTARTS   AGE
controller-manager-v3-54b4945f7f-5kvwk   1/1     Running   0          4m49s
edge-client-65995fbb78-hvp25             1/1     Running   0          6m
rafay-connector-v3-5dc986d5d9-hb2t7      1/1     Running   0          4m49s
relay-agent-6f555c4dbf-hrr4b             1/1     Running   0          6m
```

**Validation from Rafay Console**

- Login to Rafay console with the credentials used in the blueprint
- Navigate to Clusters and click on "cluster-name"

![RafayConsoleClusterScreenshot](../assets/images/rafay_console_cluster.png)





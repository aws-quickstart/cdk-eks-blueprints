# Kubeflow AddOn
The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes simple, portable and scalable.
Our goal is not to recreate other services, but to provide a straightforward way to deploy best-of-breed open-source systems for ML to diverse infrastructures.
Anywhere you are running Kubernetes, you should be able to run Kubeflow.

## Prerequisites:

Ensure that you have installed the following tools on your machine.

1. [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
2. [kubectl](https://Kubernetes.io/docs/tasks/tools/)
3. [cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
4. [npm](https://docs.npmjs.com/cli/v8/commands/npm-install)

## Installation

Using [npm](https://npmjs.org):

```sh
$ npm install eks-blueprints-cdk-kubeflow-ext
```

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { KubeflowAddOn } from 'eks-blueprints-cdk-kubeflow-ext';

const app = new cdk.App();

const addOn = new KubeflowAddOn(
  {
    namespace: 'kubeflow-pipelines'
  }
);

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `namespace`: the namespace of your kubernetes cluster to be used to install kubeflow

## Verify the resources

Run update-kubeconfig command. You should be able to get the command from CDK output message. More information can be found at https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/#cluster-access
```sh
aws eks update-kubeconfig --name <your cluster name> --region <your region> --role-arn arn:aws:iam::xxxxxxxxx:role/kubeflow-blueprint-kubeflowblueprintMastersRole0C1-saJBO
```

Let’s verify the resources created by Steps above.
```sh
kubectl get nodes # Output shows the EKS Managed Node group nodes

kubectl get ns | kubeflow # Output shows kubeflow namespace

kubectl get pods --namespace=kubeflow-pipelines  # Output shows kubeflow pods
```


## Execute Machine learning jobs on Kubeflow
log into Kubeflow pipeline UI by creating a port-forward to the ml-pipeline-ui service<br>

```sh
kubectl port-forward svc/ml-pipeline-ui 9000:80 -n =kubeflow-pipelines
```
and open this browser: http://localhost:9000/#/pipelines
more pipeline examples can be found at https://www.kubeflow.org/docs/components/pipelines/legacy-v1/tutorials/


## Cleanup

To clean up your EKS Blueprints, run the following commands:


```sh
cdk destroy kubeflow-blueprint 
```

## [Kubeflow on EKS Pattern](https://github.com/aws-samples/cdk-eks-blueprints-patterns/blob/main/docs/patterns/kubeflow.md) 
For more information about the Kubeflow add module, please visit [Kubeflow on EKS Pattern](https://github.com/aws-samples/cdk-eks-blueprints-patterns/blob/main/docs/patterns/kubeflow.md).


## License

The Kubeflow CDK Blueprints AddOn is licensed under the Apache 2.0 license.

## Disclaimer 
This pattern relies on an open source NPM package eks-blueprints-cdk-kubeflow-ext. Please refer to the package npm site for more information.
https://www.npmjs.com/package/eks-blueprints-cdk-kubeflow-ext

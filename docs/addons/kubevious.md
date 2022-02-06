# Kubevious Add-on

This add-on installs [Kubevious](https://github.com/kubevious/kubevious) open source Kubernetes dashboard on Amazon EKS.

Kubevious provides logical grouping of application resources eliminating the need to dig through selectors and labels. 
It also provides the ability identify potential misconfigurations using both standard and user created rules that 
monitor the cluster

## Usage

```typescript
import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new ssp.KubeviousAddOn() )
    .build(app, 'my-cluster');
```

## Configuration Options

- `version`: Version fo the Helm Chart to be used to install Kubevious
- `ingressEnabled`: Indicates whether to expose Kubevious using an ingress gateway. Set to false by default
- `kubeviousServiceType`: Type of service used to expose Kubevious backend. Set to 'ClusterIP' by default
- `mysqlRootPassword`: Default password for the root account in the MySql database. Set to 'kubevious' by default
- `values`: Arbitrary values to pass to the chart. Refer to the Kubevious [Helm Chart documentation](https://github.com/kubevious/helm) for additional details

## Validation

To validate that Kubevious is installed properly in the cluster, check that the Kubevious deployments,
services and stateful sets are running.

```shell
  kubectl get all -n kubevious  
```
Note that Kubevious is installed in its own `kubevious` namespace

## Accessing the Kubevious dashboard

To access the application, set up port-forwarding as follows: 

```shell
    kubectl port-forward $(kubectl get pods -n kubevious -l "app.kubernetes.io/component=kubevious-ui" -o jsonpath="{.items[0].metadata.name}") 8080:80 -n kubevious  
```
After the port-forwarding has started, the application can be accessed by navigating to http://localhost:8080

Alternatively, Kubevious can be exposed by enabling the ingress by setting the `ingressEnabled` configuration option to true. 

## Functionality

1. Installs Kubevious in the cluster
2. Sets up all AIM necessary roles to integrate Kubevious in AWS EKS
3. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).
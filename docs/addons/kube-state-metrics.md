# Kube State Metrics Add-on

This add-on installs [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics).

kube-state-metrics (KSM) is a simple service that listens to the Kubernetes API server and generates metrics about the state of the objects. (See examples in the Metrics section below.) It is not focused on the health of the individual Kubernetes components, but rather on the health of the various objects inside, such as deployments, nodes and pods.

kube-state-metrics Add-on is about generating metrics from Kubernetes API objects without modification. This ensures that features provided by kube-state-metrics have the same grade of stability as the Kubernetes API objects themselves.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.KubeStateMetricsAddOn()

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you
- `values`: Arbitrary values to pass to the chart. 
- [Standard helm configuration options](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that kube-state-metrics is installed properly in the cluster, check if the kube-state-metrics pods are running.

Verify if the pods are running correctly for kube-state-metrics
```bash
  kubectl get pods -A | awk '/kube-state/ {print ;exit}'  
```

## Output

There should list pod starting with name `kube-state`
For Eg:
```bash
kube-system                     kube-state-metrics-5d4c95885d-82bv4                               1/1     Running   0          13h
```

## Functionality

Applies the kube-state-metrics add-on to an Amazon EKS cluster. 
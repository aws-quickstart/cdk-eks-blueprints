# Prometheus Node Exporter Add-on

This add-on installs [prometheus-node-exporter](https://github.com/prometheus/node_exporter).

prometheus-node-exporter Add-on enables you to measure various machine resources such as memory, disk and CPU utilization. For installations from source you must install and configure it yourself. To enable the node exporter: Enable Prometheus.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.PrometheusNodeExporterAddOn()

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you
- `values`: Arbitrary values to pass to the chart. Refer to the prometheus-node-exporter [Helm Chart documentation](https://prometheus-community.github.io/helm-charts) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options)

## Validation

To validate that prometheus-node-exporter is installed properly in the cluster, check if the prometheus-node-exporter namespace is created and pods are running.

Verify if the pods are running correctly for prometheus-node-exporter in `prometheus-node-exporter` namespace.
```bash
  kubectl get pods -n prometheus-node-exporter
```


## Output

There should list 3 pods starting with name prometheus-node-exporter-
For Eg:
```bash
NAME                                      READY   STATUS    RESTARTS   AGE
prometheus-node-exporter-5bb7949947-vxf76             1/1     Running   0          2m56s
prometheus-node-exporter-cainjector-5ff98c66d-g4kpv   1/1     Running   0          2m56s
prometheus-node-exporter-webhook-fb48856b5-bpsbl      1/1     Running   0          2m56s
```

## Functionality

Applies the prometheus-node-exporter add-on to an Amazon EKS cluster. 
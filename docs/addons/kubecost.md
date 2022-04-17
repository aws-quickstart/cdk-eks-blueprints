# Kubecost AddOn

[Kubecost](https://kubecost.com) provides real-time cost visibility and insights by uncovering patterns that create overspending on infrastructure to help teams prioritize where to focus optimization efforts. By identifying root causes for negative patterns, customers using Kubecost save 30-50% or more of their Kubernetes cloud infrastructure costs. To read more about Kubecost and how to use it, see the [product and technical docs](https://docs.kubecost.com/getting-started).

## Installation

Using [npm](https://npmjs.org):

```sh
$ npm install @kubecost/kubecost-eks-blueprints-addon
```

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { KubecostAddOn } from '@kubecost/kubecost-blueprints-addon';

const app = new cdk.App();

const addOn = new KubecostAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## `KubecostAddOn` Options (props)

#### `namespace: string` (optional)

The namespace where Kubecost will be installed. Defaults to `kubecost`.

#### `kubecostToken: string` (optional)

You may get one [here](https://kubecost.com/install).

#### `version: string` (optional)

The `cost-analyzer` helm chart version. Defaults to the latest stable version specified in this repo (`1.92.0` at the time of writing).

####  `values?: { [key: string]: any }` (optional)

Custom values to pass to the chart. Config options: https://github.com/kubecost/cost-analyzer-helm-chart/blob/master/README.md#config-options 

#### `customPrometheus: string` (optional)

Kubecost comes bundled with a Prometheus installation. However, if you wish to integrate with an external Prometheus deployment, provide your local Prometheus service address with this format `http://..svc`.
Note: integrating with an existing Prometheus is only officially supported under Kubecost paid plans and requires some extra configurations on your Prometheus: https://docs.kubecost.com/custom-prom.html

#### `installPrometheusNodeExporter: boolean` (optional)

Set to false to use an existing Node Exporter DaemonSet.
Note: this requires your existing Node Exporter endpoint to be visible from the namespace where Kubecost is installed.
https://github.com/kubecost/docs/blob/main/getting-started.md#using-an-existing-node-exporter

#### `repository: string`, `release: string`, `chart: string` (optional)

Additional options for customers who may need to supply their own private Helm repository.

## Support

If you have any questions about Kubecost, get in touch with the team [on Slack](https://docs.kubecost.com/support-channels.html).

## License

The Kubecost Blueprints AddOn is licensed under the Apache 2.0 license. [Project repository](https://github.com/kubecost/kubecost-blueprints-addon)

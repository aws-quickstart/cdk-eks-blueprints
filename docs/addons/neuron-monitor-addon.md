# Neuron Monitor Addon

[Neuron Monitor](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/tools/neuron-sys-tools/neuron-monitor-user-guide.html) collects metrics and stats from the Neuron Applications running on the system and streams the collected data to stdout in JSON format.

These metrics and stats are organized into metric groups which can be configured by providing a configuration file as described in Using neuron-monitor

When running, neuron-monitor will:

- Collect the data for the metric groups which, based on the elapsed time since their last update, need to be updated
- Take the newly collected data and consolidate it into a large report
- Serialize that report to JSON and stream it to stdout from where it can be consumed by other tools - such as the sample neuron-monitor-cloudwatch.py and neuron-monitor-prometheus.py scripts.
- Wait until at least one metric group needs to be collected and repeat this flow

## Usage

###`index.ts`
```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const neuronMonitorAddon = new blueprints.addons.NeuronMonitorAddOn()

const clusterProvider = new blueprints.GenericClusterProvider({
  version: KubernetesVersion.V1_27,
  managedNodeGroups: [
    inferentiaNodeGroup()
  ]
});

function inferentiaNodeGroup(): blueprints.ManagedNodeGroup {
  return {
    id: "mng1",
      instanceTypes: [new ec2.InstanceType('inf1.2xlarge')],
      desiredSize: 1,
      maxSize: 2, 
      nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  };
}

const blueprint = blueprints.EksBlueprint.builder()
  .clusterProvider(clusterProvider)
  .addOns(neuronMonitorAddon)
  .build(app, 'my-stack-name');

```

Once deployed, you can see the monitor and device plugin deamonsets in the `kube-system` namespace.

```sh
$ kubectl get daemonset -n kube-system 

NAME                             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
neuron-monitor                   1         1         1       1            1           <none>          3m12s
```
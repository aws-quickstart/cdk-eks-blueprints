# Neuron Device Plugin Addon

[AWS Neuron](https://awsdocs-neuron.readthedocs-hosted.com/en/latest/) is the SDK used to run deep learning workloads on AWS Inferentia and AWS Trainium based instances. This addon will install the Neuron Device Plugin necessary to run the instances on Amazon EKS (and Blueprints). Note that you **must** use *inf1, inf2, trn1,* or *trn1n* instances.

## Usage

#### **`index.ts`**
```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.NeuronDevicePluginAddon();

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
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Once deployed, you can see the plugin daemonset in the `kube-system` namespace.

```sh
$ kubectl get daemonset neuron-device-plugin-daemonset -n kube-system

NAME                             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
neuron-device-plugin-daemonset   1         1         1       1            1           <none>          24m   20m
```

## Functionality

1. Deploys the plugin daemonset in `kube-system` namespace by default.
2. Provides a plugin for the blueprint to leverage the Inferentia or Trainium instances to use the Neuron SDK.
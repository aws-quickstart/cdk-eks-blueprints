# Kubeshark AddOn

[kubeshark](https://github.com/kubeshark/kubeshark)  is an API Traffic Analyzer for Kubernetes providing real-time, protocol-level visibility into Kubernetes’ internal network, capturing and monitoring all traffic and payloads going in, out and across containers, pods, nodes and clusters.

## Usage

#### **`index.ts`**
```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.KubesharkAddOn('v52.3.0');

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

#### **Another complete and comprehensive example**
```
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const account = 'XXXXXXXXXXXXX';
const region = 'us-east-2';
const version = 'auto';

blueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.ArgoCDAddOn(),
    new blueprints.addons.CalicoOperatorAddOn(),
    new blueprints.addons.MetricsServerAddOn(),
    new blueprints.addons.ClusterAutoScalerAddOn(),
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubesharkAddOn(),
    new blueprints.addons.KubeProxyAddOn()
];

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .version(version)
    .addOns(...addOns)
    .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
    .build(app, 'eks-blueprint');

```

Once deployed, you can see kubeshark pod in the `kube-system` namespace.

```sh
$ kubectl get deployments -n kube-system

NAME                                                          READY   UP-TO-DATE   AVAILABLE   AGE
blueprints-addon-kubeshark                               1/1     1            1           20m
```

## Functionality

1. Deploys the kubeshark helm chart in `kube-system` namespace by default.
2. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).
3. Supports `createNamespace` configuration to deploy the addon to a customized namespace.

## Access Kubeshark

Apply the kubernetes dashboard manifest.

```sh
$ kubectl -n kube-system port-forward svc/kubeshark-front 3000:80
```


Open the [dashboard](http://localhost:3000)

Then you should be able to see view like this
![dashboard](https://raw.githubusercontent.com/kubeshark/assets/master/png/kubeshark-ui.png)


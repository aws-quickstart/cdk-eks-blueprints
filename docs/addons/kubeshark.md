# Kubeshark AddOn

[kubeshark](https://github.com/kubeshark/kubeshark)  is an API Traffic Analyzer for Kubernetes providing real-time, protocol-level visibility into Kubernetes’ internal network, capturing and monitoring all traffic and payloads going in, out and across containers, pods, nodes and clusters.

## Usage
1. import kubeshark
```
npm i kubeshark
```
2. import it in your `blueprint.ts`
```
import { KubesharkAddOn } from 'kubeshark';
```

3. include the addon
```
    new KubesharkAddOn({})  // Provide an empty object if no specific properties are needed
```


### Full example **`index.ts`**
```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { KubesharkAddOn } from 'kubeshark';

const app = new cdk.App();
const account = '1234123412341';
const region = 'us-east-1';
const version = 'auto';

blueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.MetricsServerAddOn(),
    new blueprints.addons.ClusterAutoScalerAddOn(),
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new KubesharkAddOn({})  // Provide an empty object if no specific properties are needed
];

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .version(version)
    .addOns(...addOns)
    .useDefaultSecretEncryption(true) // set to false to turn secret encryption off (non-production/demo cases)
    .build(app, 'eks-blueprint');```
```
## validate the deployment
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


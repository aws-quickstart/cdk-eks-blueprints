# Calico Add-on

The `Calico` addon adds support for [Calico CNI](https://docs.projectcalico.org/about/about-calico) to an EKS cluster.

Calico is an open source networking and network security solution for containers. 

## Usage

```typescript
import { addons }  from '@shapirov/cdk-eks-blueprint';

const myCalicoCNI = new addon.CalicoAddon();
const addOns: Array<ClusterAddOn> = [ myCalicoCNI ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```



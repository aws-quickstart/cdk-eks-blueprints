# Argo CD Add-on

[Argo CD](https://argoproj.github.io/argo-cd/) is a declarative, GitOps continuous delivery tool for Kubernetes. The Argo CD addon provisions [Argo CD](https://argoproj.github.io/argo-cd/) into an EKS cluster.

For instructions on getting started with Argo CD once your cluster is deployed with this addon included, see our [Getting Started](/getting-started/#deploy-workloads-with-argocd) guide.

Full Argo CD project documentation [can be found here](https://argoproj.github.io/argo-cd/).

## Usage

```typescript
import { ArgoCDAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const argoCDAddOn = new ArgoCDAddOn();
const addOns: Array<ClusterAddOn> = [ argoCDAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## Functionality

1. Creates the `argo-cd` namespace.
2. Deploys the [`argo-cd`](https://argoproj.github.io/argo-helm) Helm chart into the cluster.


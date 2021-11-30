# Argo CD add-on

[Argo CD](https://argoproj.github.io/argo-cd/) is a declarative, GitOps, continuous-delivery tool for Kubernetes. The Argo CD add-on provisions [Argo CD](https://argoproj.github.io/argo-cd/) into an Amazon EKS cluster. After your cluster deploys, get started with the included Argo CD add-on. For more information, see the [Getting started](/getting-started/#deploy-workloads-with-argocd) section and [What Is Argo CD?](https://argoproj.github.io/argo-cd/)

## Usage

```typescript
import { ArgoCDAddOn, ClusterAddOn, EksBlueprint }  from '@aws-quickstart/ssp-amazon-eks';

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
2. Deploys the [`argo-cd`](https://argoproj.github.io/argo-helm) helm chart.


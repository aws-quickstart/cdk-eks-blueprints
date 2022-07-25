## Flagger Add-On

[Flagger](https://flagger.app/) is a progressive delivery tool that automates the release process for applications running on Kubernetes. It reduces the risk of introducing a new software version in production by gradually shifting traffic to the new version while measuring metrics and running conformance tests. The Flagger add-on provisions the necessary Helm chart, and namespace to allow support for flagger in an EKS workload.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.Flagger();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Functionality

1. Creates the `flagger` namespace.
2. Deploys the `flagger` Helm chart into the cluster.
3. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options)

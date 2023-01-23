# Paralus Add-On

[Paralus](https://www.paralus.io/) is a free, open source tool that enables controlled, audited access to Kubernetes infrastructure. It comes with just-in-time service account creation and user-level credential management that integrates with your RBAC and SSO. Ships as a GUI, API, and CLI.

Paralus Add-on supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options)

## Usage
```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
const app = new cdk.App();
const addOns = [
    new blueprints.addons.ParalusAddOn()
];
const blueprint = blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .build(app, 'my-stack-name');
```

### Various Paralus Helm Values
Currently, Paralus is installed with the default helm values. It is recommended to read through and understand various helm values and configure paralus to meet your needs. [https://github.com/paralus/helm-charts/tree/main/charts/ztka#values]
# Getting Started 

This getting started guide will walk you through setting up a new CDK project which leverages the `cdk-eks-blueprint` NPM module to deploy a simple SSP. 

## Install CDK 

The quickstart leverages [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/). Install CDK via the following.

```bash
npm install -g aws-cdk
```

Verify the installation.

```bash
cdk --version
```

## Project setup

Create a new `typescript` CDK project in an empty directory.

```bash
cdk init app --language typescript
```

Each combination of target account and region must be bootstrapped prior to deploying stacks.
Bootstrapping is an process of creating IAM roles and lambda functions that can execute some of the common CDK constructs.

[Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) your environment with the following command. 

```bash
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
```

## Usage

Install the `cdk-eks-blueprint` NPM package via the following.

```bash
npm i @shapirov/cdk-eks-blueprint
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following:

```typescript
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EksBluepint, Addons } from '@shapirov/cdk-eks-blueprint';

const addOns: Array<ClusterAddOn> = [
  new Addons.ArgoCDAddOn,
];

const app = new cdk.App();
const opts = {id: 'east-test-1', addOns}
new EksBlueprint(app, opts, {
  env: {
      account: 'XXXXXXXXXXXX',
      region: 'us-east-2'
  },
});
```

Deploy the stack using the following command

```
cdk deploy
```

Congratulations! You have deployed your first EKS cluster with `cdk-eks-blueprint`. This will deploy a new VPC and Subnets, deploy your EKS cluster with managed node groups, and install ArgoCD into your cluster via Helm. 
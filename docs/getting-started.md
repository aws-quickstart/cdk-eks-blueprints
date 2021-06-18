# Getting Started 

This getting started guide will walk you through setting up a new CDK project which leverages the `cdk-eks-blueprint` NPM module to deploy a simple SSP. 

## Project setup

The quickstart leverages [AWS Cloud Development Kit (CDK)](https://aws.amazon.com/cdk/). Install CDK via the following.

```bash
npm install -g aws-cdk@1.104.0
```

Verify the installation.

```bash
cdk --version
```

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

## Deploy a Blueprint EKS Cluster

Install the `cdk-eks-blueprint` NPM package via the following.

```bash
npm i @shapirov/cdk-eks-blueprint
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following code. This code will deploy a new EKS Cluster and install the `ArgoCD` addon.

```typescript
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EksBlueprint, AddOns, ClusterAddOn } from '@shapirov/cdk-eks-blueprint';

const addOns: Array<ClusterAddOn> = [
  new AddOns.ArgoCDAddOn,
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

Congratulations! You have deployed your first EKS cluster with `cdk-eks-blueprint`.

## Onboard a Team

Now that we have our cluster deployed, it is time to onboard our first team. In its simplest form, a team is represented in a Kubernetes cluster by a namespace. In order to create a new team and namespace within your cluster do the following:

Create a new file called `team-awesome`.

```
mkdir teams
touch teams/team-awesome.tsx
```

Paste the following code the file. 

```typescript
import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { App } from '@aws-cdk/core';
import { ClusterInfo, ApplicationTeam } from '@shapirov/cdk-eks-blueprint';

export class TeamAwesome extends ApplicationTeam {
    constructor(app: App) {
        super({
            name: "team-awesome",
            users: [
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user1`),  
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user2`)
            ]

        });
    }
}
```

Replace the contents of `bin/<your-app-name>.ts` with the following:

```typescript

import * as cdk from '@aws-cdk/core';
import { EksBluepint, AddOns, ClusterAddOn, Team } from '@shapirov/cdk-eks-blueprint';

import { TeamAwesome } from '../teams/team-awesome';

const addOns: Array<ClusterAddOn> = [
  new AddOns.ArgoCDAddOn,
];

const teams: Array<Team> = [
    new TeamAwesome
]

const app = new cdk.App();
const opts = {id: 'east-test-1', addOns, teams}
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

To confirm your team has been added to the cluster, run:

```bash 
kubectl get ns team-awesome
```

## Deploy workloads with ArgoCD

Next, let's walk you through how to deploy workloads to your cluster with ArgoCD. This approach leverages the [App of Apps](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) pattern to deploy multiple workloads arcoss multiple namespaces. The sample app of apps repository that we use in this walkthrough can be found [here](https://github.com/kcoleman731/argo-apps.git).

### Install ArgoCD CLI

Follow the instructions found [here](https://argoproj.github.io/argo-cd/cli_installation/) as it will include instructions for your specific OS. You can test that the ArgoCD CLI was installed correctly using the following:

```
argocd version --short --client
```

You should see output similar to the following:

```
argocd: v2.0.1+33eaf11.dirty
```

### Exposing ArgoCD

To access the ArgoCD running in your Kubernetes cluster, we simply need leverage port-forwarding.

To do so, first capture the service name in an environment variable.

```
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 
```

Next, in a new terminal tab, expose the service locally.

```
kubectl port-forward $ARGO_SERVER -n argocd 8080:443
```

Open your browser to http://localhost:8080 and you should see the Argo login screen.

### Logging Into ArgoCD

ArgoCD will create an `admin` user and password on a fresh install. To get the ArgoCD admin password, run the following.

```
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

While still port-forwarding, login via the following.

```
argocd login localhost:8080 --username admin --password $ARGO_PASSWORD
```

### Deploy workloads to your cluster

Create a project in Argo by running the following command

```
argocd proj create sample \
    -d https://kubernetes.default.svc,argocd \
    -s https://github.com/kcoleman731/argo-apps.git
```

Create the application within Argo by running the following command

```
argocd app create sample-apps \
    --dest-namespace argocd  \
    --dest-server https://kubernetes.default.svc  \
    --repo https://github.com/kcoleman731/argo-apps.git \
    --path "."
```

Sync the apps by running the following command

```
argocd app sync sample-apps 
```

### Validate deployments. 

To validate your deployments, leverage kubectl port-forwarding to access the `guestbook-ui` service for `team-burnham`.

```
kubectl port-forward svc/guestbook-ui -n team-burnham 4040:80
```

Open up `localhost:4040` in your browser and you should see the application. 



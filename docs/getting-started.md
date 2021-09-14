# Getting Started 

This guide walks you through setting up a new CDK project that uses the `cdk-eks-blueprint` NPM module to deploy an SSP. 

## Project setup

To use the `cdk-eks-blueprint` module, you must have the [AWS Cloud Development Kit (AWS CDK)](https://aws.amazon.com/cdk/) installed. To install AWS CDK, follow these steps:

```bash
npm install -g aws-cdk@1.113.0
```

Verify the installation.

```bash
cdk --version
```

Create a new `typescript` CDK project in an empty directory.

```bash
cdk init app --language typescript
```

## Deploy a Blueprint EKS Cluster

Install the `cdk-eks-blueprint` NPM package.

```bash
npm i @shapirov/cdk-eks-blueprint
```

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root directory) using the following code. This code deploys a new Amazon EKS Cluster and installs the `ArgoCD` add-on.

```typescript
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as ssp from '@shapirov/cdk-eks-blueprint';

const app = new cdk.App();

const addOns: Array<ssp.ClusterAddOn> = [
    new ssp.addons.NginxAddOn,
    new ssp.addons.ArgoCDAddOn,
    new ssp.addons.CalicoAddOn,
    new ssp.addons.MetricsServerAddOn,
    new ssp.addons.ClusterAutoScalerAddOn,
    new ssp.addons.ContainerInsightsAddOn,
    new ssp.addons.AwsLoadBalancerControllerAddOn()
];

const opts = { id: 'east-test-1', addOns }
new ssp.EksBlueprint(app, opts, {
    env: {
        account: 'XXXXXXXXXXXXX',
        region: 'us-east-1'
    },
});
```

Each combination of target account and Region must be bootstrapped prior to deploying stacks. Bootstrapping creates IAM roles and Lambda functions that can execute some of the common CDK constructs.

[Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) your environment with the following command. 

```bash
cdk bootstrap
```

Run the following command to deploy the stack, which takes about 20 minutes to complete.

```
cdk deploy
```

When you deploy your first EKS cluster using `cdk-eks-blueprint`, AWS CDK provisions the following in your cluster:

- [x] A well-architected virtual private cloud (VPC) with public and private subnets.
- [x] A well-architected Amazon EKS cluster in the Region and account you specify.
- [x] [NGINX](https://kubernetes.github.io/ingress-nginx/deploy/) to serve as a reverse proxy for your workloads. 
- [x] [Argo CD](https://argoproj.github.io/argo-cd/) to support GitOps deployments. 
- [x] [Calico](https://docs.projectcalico.org/getting-started/kubernetes/) for network policies.
- [x] [Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server) for collecting metrics.
- [x] AWS and Kubernetes resources to support [Cluster Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/cluster-autoscaler.html).
- [x] AWS and Kubernetes resources to forward logs and metrics to [Amazon CloudWatch Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html).
- [x] AWS and Kubernetes resources to support [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).
- [x] AWS and Kubernetes resources to support [AWS X-Ray](https://aws.amazon.com/xray/).

## Cluster access

When the deployment completes, you should see an output that is similar to the following:

```bash
Outputs:
east-test-1.easttest1ClusterName8D8E5E5E = east-test-1
east-test-1.easttest1ConfigCommand25ABB520 = aws eks update-kubeconfig --name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>
east-test-1.easttest1GetTokenCommand337FE3DD = aws eks get-token --cluster-name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>

Stack ARN:
arn:aws:cloudformation:us-east-1:115717706081:stack/east-test-1/e1b9e6a0-d5f6-11eb-8498-0a374cd00e27
```

To update your Kubernetes cluster configuration, run `east-test-1.easttest1ConfigCommand25ABB520`. 

```
aws eks update-kubeconfig --name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>
```

Validate that you now have Kubectl access to your cluster.

```
kubectl get namespace
```

You should see an output that lists all of your cluster namespaces. 

## Deploy workloads using Argo CD

Deploy your cluster workloads using Argo CD, which uses the [App of Apps Pattern](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) to deploy multiple workloads across multiple namespaces. For the sample App of Apps repository used here, see [SSP EKS Workloads](https://github.com/aws-samples/ssp-eks-workloads).

### Install the Argo CD CLI

For OS-specific installation instructions, see [Argo CD — Declarative GitOps CD for Kubernetes](https://argoproj.github.io/argo-cd/cli_installation/). To test the Argo CD CLI installation, run the following command:

```
argocd version --short --client
```

You should see an output that is similar to the following:

```
argocd: v2.0.1+33eaf11.dirty
```

### Expose Argo CD

To access Argo CD in your Kubernetes cluster, see [Use Port Forwarding to Access Applications in a Cluster](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/). Note that you must first capture the Argo CD service name in an environment variable.

```
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 
```

In a new terminal, expose the service locally.

```
kubectl port-forward $ARGO_SERVER -n argocd 8080:443
```

In your browser, navigate to http://localhost:8080. You should see the Argo CD login screen.

![ArgoCD](assets/images/argo-cd.png)

### Log in to Argo CD

If you are installing Argo CD for the first time, Argo CD creates an `admin` user and password. To retrieve the Argo CD administrator password, run the following command:

```
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

During port forwarding, log in using the following command:

```
argocd login localhost:8080 --username admin --password $ARGO_PASSWORD
```

Optionally, you can log in to the Argo CD UI using a generated password and the user name `admin`. 

```
echo $ARGO_PASSWORD
```

### Deploy workloads to your cluster

Create a project in Argo CD by running the following command:

```
argocd proj create sample \
    -d https://kubernetes.default.svc,argocd \
    -s https://github.com/aws-samples/ssp-eks-workloads.git
```

Create the application within Argo CD by running the following command:

```
argocd app create dev-apps \
    --dest-namespace argocd  \
    --dest-server https://kubernetes.default.svc  \
    --repo https://github.com/aws-samples/ssp-eks-workloads.git \
    --path "envs/dev"
```

Synchronize your applications by running the following command:

```
argocd app sync dev-apps 
```

### Validate deployments 

To validate your deployments, use `kubectl port-forwarding` to access the `guestbook-ui` service for `team-burnham`.

```
kubectl port-forward svc/guestbook-ui -n team-burnham 4040:80
```

In your browser, navigate to `localhost:4040`. You should see your application.

## Next steps

For more information about onboarding teams to your clusters, see [`Team` documentation](../teams). 

For more information about deploying CD pipelines for your infrastructure, see [`Pipelines` documentation](../ci-cd).

For more information about supported add-ons, see [`Add-on` documentation](../addons).

For more information about onboarding and managing workloads in your clusters, see [`Workload` documentation](../workloads). 
# Getting Started 

This getting started guide will walk you through setting up a new CDK project which leverages the `eks-blueprints` NPM module to deploy a simple Blueprints. 

## Project Setup

Before proceeding, make sure [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) is installed on your machine.

To use the `eks-blueprints` module, you must have [Node.js](https://nodejs.org/en/) and [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed. We will also use `make` to simplify build and other common actions. You can do it using the following instructions:


=== "Mac"
    ```bash
    brew install make
    brew install node
    ```

=== "Ubuntu"
    ```bash
    sudo apt install make
    sudo apt install nodejs
    ```

Create a directory that represents you project (e.g. `my-blueprints`) and then create a new `typescript` CDK project in that directory.

```bash
npm install -g n # may require sudo
n stable # may require sudo 
npm install -g aws-cdk@2.147.2 # may require sudo (Ubuntu) depending on configuration
cdk --version # must produce 2.147.2
mkdir my-blueprints
cd my-blueprints
cdk init app --language typescript
```

## Configure Your Project

Install the `eks-blueprints` NPM package (keep reading if you get an error or warning message):

```bash
npm i @aws-quickstart/eks-blueprints
```

CDK version of the EKS Blueprints is pinned as [`peerDependencies`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#peerdependencies) to the version that we tested against to minimize the risk of incompatibilities and/or broken functionality. When running the install command, NPM will detect any mismatch in the version and issue an error. For example:

```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! 
npm ERR! While resolving: my-blueprint@0.1.0
npm ERR! Found: aws-cdk-lib@2.133.0
npm ERR! node_modules/aws-cdk-lib
npm ERR!   aws-cdk-lib@"2.133.0" from the root project
npm ERR! 
npm ERR! Could not resolve dependency:
npm ERR! peer bundled aws-cdk-lib@"2.133.0" from @aws-quickstart/eks-blueprints@1.14.0
npm ERR! node_modules/@aws-quickstart/eks-blueprint
```

This message means that the version of CDK that the customer is using is different from the version of CDK used in EKS Blueprints. Locate the line `peer bundled` and check the expected version of the CDK. Make sure that in your `package.json` the version is set to the expected. In this example, `package.json` contained `"aws-cdk-lib": "2.133.0"`, while the expected version was `2.147.2`.

**Note**: after the initial installation, upgrading the version of CDK to an incompatible higher/lower version will produce a warning, but will succeed. For community support (submitting GitHub issues) please make sure you have a matching version configured.

Example warning:

```
npm WARN 
npm WARN Could not resolve dependency:
npm WARN peer bundled aws-cdk-lib@"2.133.0" from @aws-quickstart/eks-blueprints@1.14.0
```

## Deploy EKS Clusters

Replace the contents of `bin/<your-main-file>.ts` (where `your-main-file` by default is the name of the root project directory) with the following code. This code will deploy a new EKS Cluster and install a number of addons.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const account = 'XXXXXXXXXXXXX';
const region = 'us-east-2';
const version = 'auto';

blueprints.HelmAddOn.validateHelmVersions = true; // optional if you would like to check for newer versions

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.ArgoCDAddOn(),
    new blueprints.addons.MetricsServerAddOn(),
    new blueprints.addons.ClusterAutoScalerAddOn(),
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(), // support network policies ootb
    new blueprints.addons.CoreDnsAddOn(),
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

Each combination of target account and region must be bootstrapped prior to deploying stacks. Bootstrapping is a process of creating IAM roles and lambda functions that can execute some of the common CDK constructs.

For application of the EKS Blueprints Framework with [AWS Organizations](https://aws.amazon.com/organizations/), [Multi-account framework and Control Tower](https://docs.aws.amazon.com/controltower/latest/userguide/aws-multi-account-landing-zone.html) consider a process to automatically or manually CDK-bootstrapping new (workload/environment) accounts when they are added to the organization. More info on account bootstrapping [here](https://aws.amazon.com/blogs/mt/how-to-automate-the-creation-of-multiple-accounts-in-aws-control-tower/).

[Bootstrap](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html) your environment with the following command. 

```bash
cdk bootstrap aws://<your-account-number>/<region-to-bootstrap>
```

Note: if the account/region combination used in the code example above is different from the initial combination used with `cdk bootstrap`, you will need to perform `cdk bootstrap` again to avoid error.

Please reference [CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) usage doc for detail.

Setup the `AWS_REGION` environment variable and deploy the stack using the following command. This command will take roughly 20 minutes to complete.

```
export AWS_REGION=us-east-2 # Replace this with region of your choice.
cdk deploy
```

Note: Your terminal needs access to an AWS environment along with the `AWS_REGION` environment variable setup. If you fail to do so, you will observe following errors logs in your `cdk deploy` command. The stack will still run fine but will fall back picking default versions for the addon from `versionMap` in the respective `CoreAddon` instead of making an EKS API call to retrieve the latest version for the core addon.

```
 Error  Region is missing
error stack:
  • index.js    default
        /node_modules/@smithy/config-resolver/dist-cjs/index.js:117
  • index.js
        /node_modules/@smithy/node-config-provider/dist-cjs/index.js:72
  • index.js
        /node_modules/@smithy/property-provider/dist-cjs/index.js:79
  • index.js    async coalesceProvider
        /node_modules/@smithy/property-provider/dist-cjs/index.js:106
  • index.js
        async /node_modules/@smithy/property-provider/dist-cjs/index.js:117
  • index.js    async region
        /node_modules/@smithy/config-resolver/dist-cjs/index.js:142
  • httpAuthSchemeProvider.js   async Object.defaultEKSHttpAuthSchemeParametersProvider [as httpAuthSchemeParametersProvider]
        /node_modules/@aws-sdk/client-eks/dist-cjs/auth/httpAuthSchemeProvider.js:9
  • index.js
        async /node_modules/@smithy/core/dist-cjs/index.js:61
  • index.js
        async /node_modules/@aws-sdk/middleware-logger/dist-cjs/index.js:33
  • index.ts    async VpcCniAddOn.provideVersion
        /node_modules/@aws-quickstart/eks-blueprints/lib/addons/core-addon/index.ts:187
2024-04-29 19:33:48.638 WARN    /node_modules/@aws-quickstart/eks-blueprints/lib/addons/core-addon/index.ts:209 main    Failed to retrieve add-on versions from EKS for add-on vpc-cni. Falling back to default version.
```

Congratulations! You have deployed your first EKS cluster with `eks-blueprints`. The above code will provision the following:

- [x] A new Well-Architected VPC with both Public and Private subnets.
- [x] A new Well-Architected EKS cluster in the region and account you specify.
- [x] [Nginx](https://docs.nginx.com/nginx-ingress-controller/technical-specifications/) into your cluster to serve as a reverse proxy for your workloads. 
- [x] [ArgoCD](https://argoproj.github.io/argo-cd/) into your cluster to support GitOps deployments. 
- [x] [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) into your cluster to support metrics collection.
- [x] AWS and Kubernetes resources needed to support [Cluster Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/cluster-autoscaler.html).
- [x] AWS and Kubernetes resources needed to forward logs and metrics to [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html).
- [x] AWS and Kubernetes resources needed to support [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).
- [x] [Amazon VPC CNI add-on (VpcCni)](https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html) into your cluster to support native VPC networking for Amazon EKS.
- [x] [CoreDNS Amazon EKS add-on (CoreDns)](https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html) into your cluster. CoreDns is a flexible, extensible DNS server that can serve as the Kubernetes cluster DNS
- [x] [ kube-proxy Amazon EKS add-on (KubeProxy)](https://docs.aws.amazon.com/eks/latest/userguide/managing-kube-proxy.html) into your cluster to maintains network rules on each Amazon EC2 node
- [x] AWS and Kubernetes resources needed to support [AWS X-Ray](https://aws.amazon.com/xray/).

## Cluster Access

Once the deploy completes, you will see output in your terminal window similar to the following:

```bash
Outputs:
east-test-1.easttest1ClusterName8D8E5E5E = east-test-1
east-test-1.easttest1ConfigCommand25ABB520 = aws eks update-kubeconfig --name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>
east-test-1.easttest1GetTokenCommand337FE3DD = aws eks get-token --cluster-name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>

Stack ARN:
arn:aws:cloudformation:us-east-1:115717706081:stack/east-test-1/e1b9e6a0-d5f6-11eb-8498-0a374cd00e27
```

To update your Kubernetes config for you new cluster, copy and run the `east-test-1.easttest1ConfigCommand25ABB520` command (the second command) in your terminal. 

```
aws eks update-kubeconfig --name east-test-1 --region us-east-1 --role-arn <ROLE_ARN>
```

Validate that you now have `kubectl` access to your cluster via the following:

```
kubectl get namespace
```

You should see output that lists all namespaces in your cluster. 

## Deploy workloads with ArgoCD

Next, let's walk you through how to deploy workloads to your cluster with ArgoCD. This approach leverages the [App of Apps](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) pattern to deploy multiple workloads across multiple namespaces. The sample app of apps repository that we use in this getting started guide can be found [here](https://github.com/aws-samples/eks-blueprints-workloads).

You can leverage [Automatic Bootstrapping](addons/argo-cd.md#bootstrapping) for automatic onboarding of workloads. This feature may be leveraged even when workload repositories are not ready yet, as it creates a placeholder for future workloads and decouples workload onboarding for the infrastructure provisioning pipeline. The next steps, described in this guide apply for cases when customer prefer to bootstrap their workloads manually through ArgoCD UI console.

### Install ArgoCD CLI

These steps are needed for manual workload onboarding. For automatic bootstrapping please refer to the [Automatic Bootstrapping](addons/argo-cd.md#bootstrapping).

Follow the instructions found [here](https://argo-cd.readthedocs.io/en/stable/cli_installation/) as it will include instructions for your specific OS. You can test that the ArgoCD CLI was installed correctly using the following:

```
argocd version --short --client
```

You should see output similar to the following:

```
argocd: v2.0.1+33eaf11.dirty
```

### Exposing ArgoCD

To access ArgoCD running in your Kubernetes cluster, we can leverage [Kubernetes Port Forwarding](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/). To do so, first capture the ArgoCD service name in an environment variable.

```
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 
```

Next, in a new terminal tab, expose the service locally.

```
kubectl port-forward $ARGO_SERVER -n argocd 8080:443
```

Open your browser to http://localhost:8080 and you should see the ArgoCD login screen.

![ArgoCD](./assets/images/argo-cd.png)

### Logging Into ArgoCD

ArgoCD will create an `admin` user and password on a fresh install. To get the ArgoCD admin password, run the following.

```
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

While still port-forwarding, login via the following.

```
argocd login localhost:8080 --username admin --password $ARGO_PASSWORD
```

You can also login to the ArgoCD UI with generated password and the username `admin`. 

```
echo $ARGO_PASSWORD
```

### Deploy workloads to your cluster

Create a project in Argo by running the following command

```
argocd proj create sample \
    -d https://kubernetes.default.svc,argocd \
    -s https://github.com/aws-samples/eks-blueprints-workloads.git
```

Create the application within Argo by running the following command

```
argocd app create dev-apps \
    --dest-namespace argocd  \
    --dest-server https://kubernetes.default.svc  \
    --repo https://github.com/aws-samples/eks-blueprints-workloads.git \
    --path "envs/dev"
```

Sync the apps by running the following command

```
argocd app sync dev-apps 
```

### Validate deployments. 

To validate your deployments, leverage `kubectl port-forwarding` to access the `guestbook-ui` service for `team-riker`.

```
kubectl port-forward svc/guestbook-ui -n team-riker 4040:80
```

Open up `localhost:4040` in your browser and you should see the application.

## Next Steps

For information on onboarding teams to your clusters, see [`Team` documentation](./teams/teams.md). 

For information on deploying Continuous Delivery pipelines for your infrastructure, see [`Pipelines` documentation](./pipelines.md).

For information on supported add-ons, see [`Add-on` documentation](./addons/index.md)

For information on Onboarding and managing workloads in your clusters, see [`Workload` documentation](https://github.com/aws-samples/eks-blueprints-workloads). 

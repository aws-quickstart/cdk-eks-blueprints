# JupyterHub Add-on

JupyterHub add-on is based on the [JupyterHub](https://github.com/jupyterhub/jupyterhub) project that supports a multi-user Hub to spawn, manage, and proxy multiple instances of single user Jupyter notebook server.

The Hub can offer notebook servers to a class of students, a corporate data science workgroup, a scientific research project, or a high-performance computing group.

For more information regarding a Jupyter notebook, please consult the [official documentation](https://jupyter-notebook.readthedocs.io/en/stable/notebook.html).

***IMPORTANT***: This add-on depends on [EBS CSI Driver](ebs-csi-driver.md) Add-on for using EBS as persistent storage.

***EBS CSI Driver or EFS CSI Driver add-on must be present in add-on array*** and ***must be in add-on array before the Jupyter add-on*** for it to work, as shown in below example (with EBS). Otherwise will run into error `Assertion failed: Missing a dependency for <EbsCsiDriverAddOn or EfsCsiDriverAddOn>`.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const subdomain: string = utils.valueFromContext(scope, "dev.subzone.name", "jupyterhub.some.example.com");
const parentDnsAccountId = scope.node.tryGetContext("parent.dns.account")!;
const parentDomain = utils.valueFromContext(scope, "parent.hostedzone.name", "some.example.com");

const jupyterHubAddOn = new blueprints.addons.JupyterHubAddOn({
  efsConfig:{
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    pvcName: "efs-persist",
    capacity: "120Gi",
  },
  oidcConfig?: {
    callbackUrl: "<Callback URL>",
    authUrl: "<Authorization URL>",
    tokenUrl: "<Token URL>",
    userDataUrl: "<User Data URL>",
    clientId: "<Client ID>",
    clientSecret: "<Client Secret>",
    scope: [], //list of OIDC provider scopes
    usernameKey: "<username key>",
  },
  serviceType: blueprints.JupyterHubServiceType.ALB,
  ingressHosts: [jupyterDNSname],
  ingressAnnotations: {
    'external-dns.alpha.kubernetes.io/hostname': `${jupyterDNSname}`,
  },
  notebookStack: 'jupyter/datascience-notebook',
  certificateResourceName?: 'your-certificate',
});
const awsAlbAddOn = new blueprints.addons.AwsLoadBalancerControllerAddOn(),
const efsCsiAddOn = new blueprints.addons.EfsCsiDriverAddOn();
const externalDnsAddOn = new blueprints.addons.ExternalDnsAddOn({
  hostedZoneResources: [GlobalResources.HostedZone]
}),
const addOns: Array<blueprints.ClusterAddOn> = [ awsAlbAddOn, externalDnsAddOn, efsCsiAddOn, jupyterHubAddOn ];

const blueprint = blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.HostedZone, new DelegatingHostedZoneProvider({
    parentDomain,
    subdomain,
    parentDnsAccountId,
    delegatingRoleName: 'DomainOperatorRole',
    wildcardSubdomain: true
  }))
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

To validate that the JupyterHub add-on is running ensure that the add-on deployments for the controller and the webhook are in `RUNNING` state:

```bash
# Assuming add-on is installed in the jupyterhub.
$ kubectl get po -n jupyterhub
NAME                              READY   STATUS    RESTARTS   AGE
continuous-image-puller-2skff     1/1     Running   0          23m
continuous-image-puller-m6s5f     1/1     Running   0          23m
hub-7dc8888f68-67hnl              1/1     Running   0          23m
jupyter-admin                     1/1     Running   0          16m
proxy-5df778944c-brrbf            1/1     Running   0          23m
user-scheduler-7dbd789bc4-8zrjs   1/1     Running   0          23m
user-scheduler-7dbd789bc4-gcb8z   1/1     Running   0          23m
```

## Functionality

1. Deploys the jupyterhub helm chart in `jupyterhub` namespace by default.
2. JupyterHub is backed with persistent storage. You must provide ***one (and only one)*** of the following configuration (or otherwise will receive an error):
  - Leverage EBS as persistent storage with storage type and capacity provided. If you provide this configuration, ***EBS CSI Driver add-on must be present in add-on array*** and ***must be in add-on array before the JupyterHub add-on*** for it to work, as shown in above example. Otherwise it will not work.
  - Leverage EFS as persistent storage with the name, capacity and file system removal policy provided. If you provide this configuration, ***EFS CSI Driver add-on must be present in add-on array*** and ***must be in add-on array before the JupyterHub add-on*** for it to work, as shown in above example. Otherwise it will not work.
3. (Optional) Leverage OIDC Provider as a way to manage authentication and authorization. If not provided, the default creates no user, and the user will be able to login with any arbitrary username and password. **It is highly recommended to leverage an Identity provider for any production use case.**
4. Exposes the proxy service in three different way based on configuration:
  - Expose using Ingress controller and AWS Application Load Balancer. ***This requires AWS Load Balancer Controller add-on and it must be in add-on array before the JupyterHub add-on***. This will also look for any additional Ingress annotations provided by the user to be tagged.
  - Expose using Loadbalancer Service and AWS Network Load Balancer. ***This requires AWS Load Balancer Controller add-on and it must be in add-on array before the JupyterHub add-on***.
  - Expose using ClusterIP Service. 
5. (Optional) Annotates Ingress with user-provided AWS Certificate Manager certificate name. It will be looked up and automatically tagged to be used with Ingress. It will require user to provide a DNS name and ***External DNS add-on to be added in add-on array before the JupyterHub add-on***.
6. (Optional) User can choose a different notebook stack than the standard one provided. Jupyter team maintains a set of Docker image definition in a GitHub repository as explained [here](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html).
7. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

***Note***: For custom helm values, please consult the [official documentation](https://zero-to-jupyterhub.readthedocs.io/en/latest/resources/reference.html#). 

## Using JupyterHub

JupyterHub, by default, creates a proxy service called `proxy-public` that will be accessible in different way based on the user configuration setting under `serviceType`. For example, if you set it as `NLB`, then it is exposed to a `LoadBalancer` type Kubernetes service, which will integrate with AWS Network Load Balancer as indicated when running the following command:

```bash
kubectl get svc -n jupyterhub
NAME           TYPE           CLUSTER-IP      EXTERNAL-IP                                                               PORT(S)        AGE
hub            ClusterIP      172.20.171.28   <none>                                                                    8081/TCP       26m
proxy-api      ClusterIP      172.20.31.32    <none>                                                                    8001/TCP       26m
proxy-public   LoadBalancer   172.20.14.210   xxxxxxxx-1234567890.us-west-2.elb.amazonaws.com   80:32733/TCP   26m
```

You can log into the JupyterHub portal by accessing the Load Balancer endpoint in any browser. 

![JupyterHub Login](./../assets/images/jupyterhub-login-page.png)

A default arbirary username with password can be entered to log in. Once logged in, you should be able to access the main portal page.

![JupyterHub Portal](./../assets/images/jupyterhub-loggedin.png)

As stated above, **it is highly recommended to leverage an Identity provider for any production use case.** Please consult the official guide [here](https://zero-to-jupyterhub.readthedocs.io/en/latest/administrator/authentication.html#oauth2-based-authentication) for various OAuth2 based authentication methods.
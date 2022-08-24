# JupyterHub Add-on

Karpenter add-on is based on the [JupyterHub](https://github.com/jupyterhub/jupyterhub) project that supports a multi-user Hub to spawn, manage, and proxy multiple instances of single user Jupyter notebook server.

The Hub can offer notebook servers to a class of students, a corporate data science workgroup, a scientific research project, or a high-performance computing group.

For more information regarding a Jupyter notebook, please consult the [official documentation](https://jupyter-notebook.readthedocs.io/en/stable/notebook.html).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const jupyterHubAddOn = new blueprints.addons.JupyterHubAddOn();
const addOns: Array<blueprints.ClusterAddOn> = [ jupyterHubAddOn ];

const blueprint = blueprints.EksBlueprint.builder()
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
2. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

***Note***: For custom helm values, please consult the [official documentation](https://zero-to-jupyterhub.readthedocs.io/en/latest/resources/reference.html#). 

## Using JupyterHub

JupyterHub, by default, creates a proxy that is exposed to a `LoadBalancer` type Kubernetes service, which will integrate with AWS Load Balancer as indicated when running the following command:

```bash
kubectl get svc -n jupyterhub
NAME           TYPE           CLUSTER-IP      EXTERNAL-IP                                                               PORT(S)        AGE
hub            ClusterIP      172.20.171.28   <none>                                                                    8081/TCP       26m
proxy-api      ClusterIP      172.20.31.32    <none>                                                                    8001/TCP       26m
proxy-public   LoadBalancer   172.20.14.210   xxxxxxxx-1234567890.us-west-2.elb.amazonaws.com   80:32733/TCP   26m
```

You can log into the JupyterHub portal by accessing the Load Balancer endpoint in any browser. 

![JupyterHub Login](./../assets/images/jupyterhub-login-page.png)

A default `admin` username with `admin` as password is created initially. Once logged in, you should be able to access the main portal page.

![JupyterHub Portal](./../assets/images/jupyterhub-loggedin.png)
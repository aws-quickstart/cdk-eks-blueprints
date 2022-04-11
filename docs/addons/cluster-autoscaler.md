# Cluster Autoscaler Add-on

The Cluster Autoscaler add-on adds support for [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler) to an EKS cluster. Cluster Autoscaler is a tool that automatically adjusts the number of nodes in your cluster when:

- pods fail due to insufficient resources, or 
- pods are rescheduled onto other nodes due to being in nodes that are underutilized for an extended period of time.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.ClusterAutoscalerAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Functionality

1. Adds proper IAM permissions (such as modify autoscaling groups, terminate instances, etc.) to the NodeGroup IAM role. 
2. Configures service account, cluster roles, roles, role bindings and deployment.
3. Resolves proper CA image to pull based on the Kubernetes version.
4. Configuration allows passing a specific version of the image to pull.
5. Applies proper tags for discoverability to the EC2 instances.
6. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

## Testing the scaling functionality

The following steps will help test and validate Cluster Autoscaler functionality in your cluster.

1. Deploy a sample app as a deployment.
2. Create a Horizontal Pod Autoscaler (HPA) resource.
3. Generate load to trigger scaling.

### Deploy a sample app

Take a note of the number of nodes available:

```bash
kubectl get nodes
```

```
NAME                                         STATUS   ROLES    AGE   VERSION
ip-10-0-189-107.us-west-2.compute.internal   Ready    <none>   80m   v1.19.6-eks-49a6c0
```

The first step is to create a sample application via deployment and request 20m of CPU:

```bash
kubectl create deployment php-apache --image=us.gcr.io/k8s-artifacts-prod/hpa-example
kubectl set resources deploy php-apache --requests=cpu=20m 
kubectl expose deployment php-apache --port 80
```

You can see that there's 1 pod currently running:

```bash
kubectl get pod -l app=php-apache
```

```
NAME                          READY   STATUS    RESTARTS   AGE
php-apache-55c4584468-vsbl7   1/1     Running   0          63s
```

### Create HPA resource

Now we can create Horizontal Pod Autoscaler resource with 50% CPU target utilization, and the minimum number of pods at 1 and max at 20:
```bash
kubectl autoscale deployment php-apache \
    --cpu-percent=50 \
    --min=1 \
    --max=50
```

You can verify by looking at the hpa resource:

```bash
kubectl get hpa
```

```
NAME         REFERENCE               TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
php-apache   Deployment/php-apache   10%/50%   1         50        2          52s
```

### Generate load

With the resources created, you can generate load on the apache server with a busybox container:

```bash
kubectl --generator=run-pod/v1 run -i --tty load-generator --image=busybox /bin/sh
```

You can generate the actual load on the shell by running a while loop:

```bash
while true; do wget -q -O - http://php-apache; done
```

### Verify that Cluster Autoscaler works

While the load is being generated, access another terminal to verify that HPA is working. The following command should return a list of many nods created (as many as 10):

```bash
kubectl get pods -l app=php-apache -o wide --watch
```

With more pods being created, you would expect more nodes to be created; you can access the Cluster Autoscaler logs to confirm:

```bash
kubectl -n kube-system logs -f deployment/blueprints-addon-cluster-autoscaler-aws-cluster-autoscaler
```

Lastly, you can list all the nodes and see that there are now multiple nodes:

```bash
kubectl get nodes
```

```
NAME                                         STATUS   ROLES    AGE   VERSION
ip-10-0-187-70.us-west-2.compute.internal    Ready    <none>   73s   v1.19.6-eks-49a6c0
ip-10-0-189-107.us-west-2.compute.internal   Ready    <none>   84m   v1.19.6-eks-49a6c0
ip-10-0-224-226.us-west-2.compute.internal   Ready    <none>   46s   v1.19.6-eks-49a6c0
ip-10-0-233-105.us-west-2.compute.internal   Ready    <none>   90s   v1.19.6-eks-49a6c0
```

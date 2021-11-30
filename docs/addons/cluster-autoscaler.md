# Cluster Autoscaler add-on

The [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler) add-on is a tool that automatically adjusts the number of nodes in your cluster when either of the following conditions are met:

- Pods fail due to insufficient resources. 
- Pods are transferred to other nodes due to being underutilized for an extended period.

## Usage

```typescript
import { ClusterAutoScalerAddOn }  from '@aws-quickstart/ssp-amazon-eks';

readonly myClusterAutoscaler = new ClusterAutoscalerAddOn("v1.19.1");// optionally, specify image version to pull or empty constructor
const addOns: Array<ClusterAddOn> = [ myClusterAutoscaler ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```
## Functionality

1. Adds IAM permissions, such as for modifying autoscaling groups or terminating instances, to the `NodeGroup` role. 
2. Configures service accounts, cluster roles, role bindings, and deployment.
3. Resolves the proper certificate authority image to pull, based on the Kubernetes version.
4. Allows for passing a specific version of the image to pull.
5. Applies proper tags for discoverability to Amazon EC2 instances.

## Testing the scaling functionality

Follow these steps to test the functionality of Cluster Autoscaler:

1. Deploy a sample application.
2. Create a Horizontal Pod Autoscaler (HPA) resource.
3. Generate a load to trigger scaling.

### Deploy a sample application

Note the number of available nodes:

```bash
kubectl get nodes
```

```
NAME                                         STATUS   ROLES    AGE   VERSION
ip-10-0-189-107.us-west-2.compute.internal   Ready    <none>   80m   v1.19.6-eks-49a6c0
```

Create a sample application during deployment, and request `20m` of CPU:

```bash
kubectl create deployment php-apache --image=us.gcr.io/k8s-artifacts-prod/hpa-example
kubectl set resources deploy php-apache --requests=cpu=20m 
kubectl expose php-apache --port 80
```

You should see one pod running:

```bash
kubectl get pod -l app=php-apache
```

```
NAME                          READY   STATUS    RESTARTS   AGE
php-apache-55c4584468-vsbl7   1/1     Running   0          63s
```

### Create an HPA resource

Create an HPA resource with a 50% CPU target utilization. Set the minimum number of pods to 1 and the maximum to 20:
```bash
kubectl autoscale deployment php-apache \
    --cpu-percent=50 \
    --min=1 \
    --max=20
```

Verify the result by reviewing the HPA resource:

```bash
kubectl get hpa
```

```
NAME         REFERENCE               TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
php-apache   Deployment/php-apache   10%/50%   1         20        2          52s
```

### Generate load

After you create the resources, use [Busybox](https://www.busybox.net/) to generate a load on the Apache server:

```bash
kubectl --generator=run-pod/v1 run -i --tty load-generator --image=busybox /bin/sh
```

Use a `while` loop to generate the load in the shell:

```bash
while true; do wget -q -O - http://php-apache; done
```

### Verify that Cluster Autoscaler works

While the load generates, use another terminal to verify that HPA works. The following command returns a list of created nodes (up to 10):

```bash
kubectl get pods -l app=php-apache -o wide --watch
```

Cluster Autoscaler creates more nodes as pods are added. For confirmation, review the logs:

```bash
kubectl -n kube-system logs -f deployment/cluster-autoscaler
```

List all of the nodes, and note that there are now multiple entries:

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

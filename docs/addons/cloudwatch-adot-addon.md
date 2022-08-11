# Amazon CloudWatch ADOT Add-on

[Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) collects monitoring and operational data in the form of logs, metrics, and events. You get a unified view of operational health and gain complete visibility of your AWS resources, applications, and services running on AWS and on-premises.  This add-on deploys an AWS Distro for OpenTelemetry (ADOT) Collector for CloudWatch which receives metrics and logs from the application and sends the same to CloudWatch console. You can change the mode to Daemonset, StatefulSet, and Sidecar depending upon your deployment strategy.

This add-on is not automatically installed when you first create a cluster, it must be added to the cluster in order to setup CloudWatch for remote write metrics.

For more information on the add-on, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html).

## Prerequisites
- `cert-manager` Blueprints add-on.
- `adot` EKS Blueprints add-on.

## Usage

This add-on can used with two different patterns :

Pattern # 1 : Simple and Easy - Using all default property values. This pattern deploys an ADOT collector with `deployment` as the mode to write traces to CloudWatch console.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CloudWatchAdotAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern # 2 : Overriding property value for different deployment Modes. This pattern deploys an ADOT collector on the namespace specified in `namespace`, name specified in `name` with `daemonset` as the mode to CloudWatch console. Deployment mode can be overridden to any of these values - `deployment`, `daemonset`, `statefulset`, `sidecar`.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CloudWatchAdotAddOn({
    deploymentMode: cloudWatchDeploymentMode.DEPLOYMENT,
    namepace: 'default',
    name: 'adot-collector-cloudwatch'
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that CloudWatch add-on is installed properly, ensure that the required kubernetes resources are running in the cluster

```bash
kubectl get all -n default
```

## Output
```bash
NAME                                                       READY   STATUS    RESTARTS   AGE
pod/otel-collector-cloudwatch-collector-7565f958c6-r485f   1/1     Running   0          2m41s

NAME                                                     TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/kubernetes                                       ClusterIP   172.20.0.1       <none>        443/TCP    18h
service/otel-collector-cloudwatch-collector-monitoring   ClusterIP   172.20.254.103   <none>        8888/TCP   2m43s

NAME                                                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/otel-collector-cloudwatch-collector   1/1     1            1           2m42s

NAME                                                             DESIRED   CURRENT   READY   AGE
replicaset.apps/otel-collector-cloudwatch-collector-7565f958c6   1         1         1       2m42s
```

## Functionality

Applies the CloudWatch ADOT add-on to an Amazon EKS cluster. 
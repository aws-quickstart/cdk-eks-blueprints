# AWS X-Ray ADOT Add-on

[AWS X-Ray](https://aws.amazon.com/xray/) helps developers analyze and debug production, distributed applications, such as those built using a microservices architecture. This add-on deploys an AWS Distro for OpenTelemetry (ADOT) Collector for X-Ray which receives traces from the application and sends the same to X-Ray console. You can change the mode to Daemonset, StatefulSet, and Sidecar depending upon your deployment strategy.

This add-on is not automatically installed when you first create a cluster, it must be added to the cluster in order to setup X-Ray for remote write traces.

For more information on the add-on, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html).

## Prerequisites
- `cert-manager` Blueprints add-on.
- `adot` EKS Blueprints add-on.

## Usage

This add-on can used with two different patterns :

Pattern # 1 : Simple and Easy - Using all default property values. This pattern deploys an ADOT collector in the `default` namespace with `deployment` as the mode to write traces to X-Ray console.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.XrayAdotAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern # 2 : Overriding Property value for different deployment Modes. This pattern deploys an ADOT collector on the namespace specified in `namespace`, name specified in `name` with `daemonset` as the mode to X-Ray console. Deployment mode can be overridden to any of these values - `deployment`, `daemonset`, `statefulset`, `sidecar`.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.XrayAdotAddOn({
    deploymentMode: XrayDeploymentMode.DAEMONSET,
    namespace: 'default',
    name: 'adot-collector-xray'
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that X-Ray add-on is installed properly, ensure that the required kubernetes resources are running in the cluster

```bash
kubectl get all -n default
```

## Output
```bash
NAME                                                 READY   STATUS        RESTARTS   AGE
pod/otel-collector-xray-collector-6fc44d9bbf-xdfpg   1/1     Running       0          6m44s
pod/traffic-generator-86f86d84cc-s78wv               0/1     Terminating   0          128m

NAME                                               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)             AGE
service/kubernetes                                 ClusterIP   172.20.0.1      <none>        443/TCP             3d
service/otel-collector-xray-collector              ClusterIP   172.20.83.240   <none>        4317/TCP,4318/TCP   6m46s
service/otel-collector-xray-collector-headless     ClusterIP   None            <none>        4317/TCP,4318/TCP   6m46s
service/otel-collector-xray-collector-monitoring   ClusterIP   172.20.2.85     <none>        8888/TCP            6m46s

NAME                                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/otel-collector-xray-collector   1/1     1            1           6m44s

NAME                                                       DESIRED   CURRENT   READY   AGE
replicaset.apps/otel-collector-xray-collector-6fc44d9bbf   1         1         1       6m44s
```

## Functionality

Applies the X-Ray ADOT add-on to an Amazon EKS cluster. 
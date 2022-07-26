# Amazon Managed Service for Prometheus (AMP)) Amazon EKS Add-on

Amazon Managed Service for Prometheus is a Prometheus-compatible monitoring and alerting service that makes it easy to monitor containerized applications and infrastructure at scale. This Addon deploys an AWS Distro for OpenTelemetry (ADOT) Collector for Amazon Managed Service for Prometheus (AMP) which receives OTLP metrics from the application and Prometheus metrics scraped from pods on the cluster and remote writes the metrics to AMP remote write endpoint. You can change the mode to Daemonset, StatefulSet, and Sidecar depending on your deployment strategy.

This driver is not automatically installed when you first create a cluster, it must be added to the cluster in order to setup AMP for remote write of metrics.

For more information on the driver, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html).

## Prerequisites
- `Certificate-Manager` Blueprints Addon addon.
- `ADOT` EKS Blueprints Addon.

## Usage

This Addon can used with four different ways :

Variant 1 : using Default property values.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Variant 2 : Overriding Property values for Name and Tags

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    workspaceName: 'sample-AMP-Workspace',
    workspaceTagKey: 'Environment',
    workspaceTagValue: 'Dev',
    deploymentMode: DeploymentMode.DEPLOYMENT
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
Variant 3 : Passing on AMP Remote Write Endpoint URL of an existing AMP workspace to be used to remote write metrics.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    prometheusRemoteWriteURL: 'https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-e859f589-7eed-43c1-a82b-58f44119f17d/api/v1/remote_write',
    deploymentMode: DeploymentMode.DEPLOYMENT
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Variant 4 : Overriding Property values for Different Deployment Modes. Supported Ones - DEPLOYMENT, DAEMONSET, STATEFULSET, SIDECAR

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    workspaceName: 'sample-AMP-Workspace',
    workspaceTagKey: 'Environment',
    workspaceTagValue: 'Dev',
    deploymentMode: DeploymentMode.DEPLOYMENT
    // deploymentMode: DeploymentMode.DAEMONSET
    // deploymentMode: DeploymentMode.STATEFULSET
    // deploymentMode: DeploymentMode.SIDECAR
})
const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that AMP add-on is installed properly, ensure that the required kubernetes resources are running in the cluster

```bash
kubectl get all -n default
```

## Output
```bash
NAME                                              READY   STATUS        RESTARTS   AGE
pod/my-collector-amp-collector-7877b86dd4-z9ds5   1/1     Running       0          31m
pod/traffic-generator-86f86d84cc-z78wc            0/1     Terminating   0          27m

NAME                                            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/kubernetes                              ClusterIP   172.20.0.1       <none>        443/TCP    4h35m
service/my-collector-amp-collector-monitoring   ClusterIP   172.20.216.242   <none>        8888/TCP   31m

NAME                                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/my-collector-amp-collector   1/1     1            1           31m

NAME                                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/my-collector-amp-collector-7877b86dd4   1         1         1       31m
```
 

## Functionality

Applies the AMP add-on to an Amazon EKS cluster. 
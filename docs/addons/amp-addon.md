# Amazon Managed Service for Prometheus (AMP)) Amazon EKS Add-on

Amazon Managed Service for Prometheus is a Prometheus-compatible monitoring and alerting service that makes it easy to monitor containerized applications and infrastructure at scale. This Addon deploys an AWS Distro for OpenTelemetry (ADOT) Collector for Amazon Managed Service for Prometheus (AMP) which receives OTLP metrics from the application and Prometheus metrics scraped from pods on the cluster and remote writes the metrics to AMP remote write endpoint. You can change the mode to Daemonset, StatefulSet, and Sidecar depending on your deployment strategy.

This driver is not automatically installed when you first create a cluster, it must be added to the cluster in order to setup AMP for remote write of metrics.

For more information on the driver, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html).

## Prerequisites
- `Certificate-Manager` Blueprints Addon addon.
- `ADOT` EKS Blueprints Addon.

## Usage

This Addon can used with four different patterns :

Pattern # 1 : Simple and Easy - Using all default property values. This pattern creates a new AMP workspace with default property values such as `workspaceName`, `tags` and deploys an ADOT collector with `deployment` as the mode to remote write metrics to AMP workspace.

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

Pattern # 2 : Overriding property values for Name and Tags for a custom AMP Workspace name and tags. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector with `deployment` as the mode to remote write metrics to AMP workspace.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    workspaceName: 'sample-AMP-Workspace',
    workspaceTag: [{
            key: 'Name',
            value: 'Sample-AMP-Workspace',
        },
        {
            key: 'Environment',
            value: 'Development',
        },
        {
            key: 'Department',
            value: 'Operations',
    }],
    deploymentMode: DeploymentMode.DEPLOYMENT
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
Pattern # 3 : Passing on AMP Remote Write Endpoint URL of an existing AMP workspace to be used to remote write metrics. This pattern does not create an AMP workspace. Deploys an ADOT collector with `deployment` as the mode to remote write metrics to AMP workspace of the URL passed as input. This pattern ignores any other property values passed if `prometheusRemoteWriteURL` is present.

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

Pattern # 4 : Overriding Property values for different deployment Modes. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector with `daemonset` as the mode to remote write metrics to AMP workspace. Deployment mode can be overridden to any of these values - `deployment`, `daemonset`, `statefulset`, `sidecar`.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    workspaceName: 'sample-AMP-Workspace',
    workspaceTag: [{
            key: 'Name',
            value: 'Sample-AMP-Workspace',
        },
        {
            key: 'Environment',
            value: 'Development',
        },
        {
            key: 'Department',
            value: 'Operations',
    }],
    deploymentMode: DeploymentMode.DAEMONSET
    // deploymentMode: DeploymentMode.DEPLOYMENT
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
pod/otel-collector-amp-collector-7877b86dd4-z9ds5   1/1     Running       0          31m

NAME                                            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/kubernetes                              ClusterIP   172.20.0.1       <none>        443/TCP    4h35m
service/otel-collector-amp-collector-monitoring ClusterIP   172.20.216.242   <none>        8888/TCP   31m

NAME                                         READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/otel-collector-amp-collector   1/1     1            1           31m

NAME                                                    DESIRED   CURRENT   READY   AGE
replicaset.apps/otel-collector-amp-collector-7877b86dd4   1         1         1       31m
```
 

## Functionality

Applies the AMP add-on to an Amazon EKS cluster. 
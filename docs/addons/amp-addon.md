# Amazon Managed Service for Prometheus (AMP) ADOT Add-on

Amazon Managed Service for Prometheus is a Prometheus-compatible monitoring and alerting service that makes it easy to monitor containerized applications and infrastructure at scale. This add-on deploys an AWS Distro for OpenTelemetry (ADOT) Collector for Amazon Managed Service for Prometheus (AMP) which receives OTLP metrics from the application and Prometheus metrics scraped from pods on the cluster and remote writes the metrics to AMP remote write endpoint. You can change the mode to Daemonset, StatefulSet, and Sidecar depending upon your deployment strategy.

This add-on is not automatically installed when you first create a cluster, it must be added to the cluster in order to setup AMP for remote write of metrics.

For more information on the add-on, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html). please review the Amazon Managed Service for Prometheus supported regions [documentation page](https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html) for more information.

## Prerequisites
- `adot` EKS Blueprints add-on.
- `kube-state-metrics` EKS Blueprints add-on.
- `prometheus-node-explorter` EKS Blueprints add-on.

## Usage

This add-on can used with four different patterns :

Pattern # 1 : Simple and Easy - Using all default property values. This pattern creates a new AMP workspace with default property values such as `workspaceName`, `namespace` with no tags on the AMP workspace and deploys an ADOT collector in the `default` namespace with `deployment` as the mode to remote write metrics to AMP workspace. 

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern # 2 : Overriding property values for Name and Tags for a custom AMP Workspace name and tags. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `deployment` as the mode to remote write metrics to AMP workspace.

```typescript
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
    deploymentMode: DeploymentMode.DEPLOYMENT,
    namespace: 'default',
    name: 'adot-collector-amp'
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
Pattern # 3 : Passing on AMP Remote Write Endpoint URL of an existing AMP workspace to be used to remote write metrics. This pattern does not create an AMP workspace. Deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `deployment` as the mode to remote write metrics to AMP workspace of the URL passed as input. This pattern ignores any other property values passed if `prometheusRemoteWriteURL` is present.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
    prometheusRemoteWriteURL: 'https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-e859f589-7eed-43c1-a82b-58f44119f17d/api/v1/remote_write',
    deploymentMode: DeploymentMode.DEPLOYMENT,
    namespace: 'default',
    name: 'adot-collector-amp'
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern # 4 : Overriding property values for different deployment Modes. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `daemonset` as the mode to remote write metrics to AMP workspace. Deployment modes can be overridden to any of these values - `deployment`, `daemonset`, `statefulset`, `sidecar`.

```typescript
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
    deploymentMode: DeploymentMode.DAEMONSET,
    namespace: 'default',
    name: 'adot-collector-amp'
    // deploymentMode: DeploymentMode.DEPLOYMENT
    // deploymentMode: DeploymentMode.STATEFULSET
    // deploymentMode: DeploymentMode.SIDECAR
})
const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that AMP add-on is installed properly, ensure that the required kubernetes resources are running in the cluster:

```bash
kubectl get all -n default
```

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
## Testing

To test whether Amazon Managed Service for Prometheus received the metrics, Please use the following commands:
For instructions on installing awscurl, see [awscurl](https://github.com/okigan/awscurl).

```bash
AMP_WORKSPACE_NAME="sample-AMP-Workspace" 
# The above should be replaced with your AMP workspace name if you are passing remote write URL specified in Pattern #3.
WORKSPACE_ID=$(aws amp list-workspaces \
  --alias $AMP_WORKSPACE_NAME --region=${AWS_REGION} --query 'workspaces[0].[workspaceId]' --output text)
AMP_ENDPOINT_QUERY=https://aps-workspaces.$AWS_REGION.amazonaws.com/workspaces/$WORKSPACE_ID/api/v1/query\?query=
awscurl --service="aps" --region=${AWS_REGION} ${AMP_ENDPOINT_QUERY}up
```

## Functionality

Applies the Amazon Managed Service for Prometheus (AMP) add-on to an Amazon EKS cluster. 
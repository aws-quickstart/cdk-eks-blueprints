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

Pattern #1: Simple and Easy - Using all default property values. This pattern creates a new AMP workspace with default property values such as `workspaceName`, `namespace` with no tags on the AMP workspace and deploys an ADOT collector in the `default` namespace with `deployment` as the mode to remote write metrics to AMP workspace. 

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

With the same pattern, to deploy ADOT collector in non-default namespace:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AmpAddOn({
                ampPrometheusEndpoint: ampWorkspace.attrPrometheusEndpoint,
                namespace: 'adot'
              }),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern #2: Overriding property values for Name and Tags for a custom AMP Workspace name and tags. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `deployment` as the mode to remote write metrics to AMP workspace.

```typescript
import * as cdk from 'aws-cdk-lib';
import { CfnWorkspace } from 'aws-cdk-lib/aws-aps';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const ampWorkspaceName = "blueprints-amp-workspace";
const ampWorkspace: CfnWorkspace = blueprints.getNamedResource(ampWorkspaceName);

const addOn = new blueprints.addons.AmpAddOn({
    ampPrometheusEndpoint: ampWorkspace.attrPrometheusEndpoint,
    deploymentMode: DeploymentMode.DEPLOYMENT,
    namespace: 'default',
    name: 'adot-collector-amp'
})

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .resourceProvider(ampWorkspaceName, new blueprints.CreateAmpProvider(ampWorkspaceName, ampWorkspaceName, [
    {
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
    }
  ]))
  .build(app, 'my-stack-name');
```
Pattern #3: Passing on AMP Remote Endpoint of an existing AMP workspace to be used to remote write metrics. This pattern does not create an AMP workspace. Deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `deployment` as the mode to remote write metrics to AMP workspace of the URL passed as input. This pattern ignores any other property values passed if `ampPrometheusEndpoint` is present.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const ampPrometheusEndpoint = "https://aps-workspaces.us-west-2.amazonaws.com/workspaces/ws-e859f589-7eed-43c1-a82b-58f44119f17d";

const addOn = new blueprints.addons.AmpAddOn({
    ampPrometheusEndpoint: ampPrometheusEndpoint,
    deploymentMode: DeploymentMode.DEPLOYMENT,
    namespace: 'default',
    name: 'adot-collector-amp'
})

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern #4: Overriding property values for different deployment Modes. This pattern creates a new AMP workspace with property values passed on such as `workspaceName`, `tags` and deploys an ADOT collector on the namespace specified in `namespace` with name in `name` and `daemonset` as the mode to remote write metrics to AMP workspace. Deployment modes can be overridden to any of these values - `deployment`, `daemonset`, `statefulset`, `sidecar`.

```typescript
import * as cdk from 'aws-cdk-lib';
import { CfnWorkspace } from 'aws-cdk-lib/aws-aps';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const ampWorkspaceName = "blueprints-amp-workspace";
const ampWorkspace: CfnWorkspace = blueprints.getNamedResource(ampWorkspaceName);

const addOn = new blueprints.addons.AmpAddOn({
    ampPrometheusEndpoint: ampWorkspace.attrPrometheusEndpoint,
    deploymentMode: DeploymentMode.DAEMONSET,
    namespace: 'default',
    name: 'adot-collector-amp'
    // deploymentMode: DeploymentMode.DEPLOYMENT
    // deploymentMode: DeploymentMode.STATEFULSET
    // deploymentMode: DeploymentMode.SIDECAR
})

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .resourceProvider(ampWorkspaceName, new blueprints.CreateAmpProvider(ampWorkspaceName, ampWorkspaceName,{
    {
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
    }
  }))
  .build(app, 'my-stack-name');
```

Pattern #5: Configuring rules into AMP. This pattern creates recording rules and/or alerting rules, based on the YAML files provided. A workspace ARN is also required as input.

```typescript
import * as cdk from 'aws-cdk-lib';
import { CfnWorkspace } from 'aws-cdk-lib/aws-aps';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const ampWorkspaceName = "blueprints-amp-workspace";
const ampWorkspace = blueprints.getNamedResource(ampWorkspaceName);
const attrPrometheusEndpoint = ampWorkspace.attrPrometheusEndpoint;
const ampWorkspaceArn = ampWorkspace.attrArn;

const addOn = new blueprints.addons.AmpAddOn({
    ampPrometheusEndpoint: attrPrometheusEndpoint,
    ampRules: {
        ampWorkspaceArn: ampWorkspaceArn,
        ruleFilePaths: [
            __dirname + '/../common/resources/amp-config/alerting-rules.yml',
            __dirname + '/../common/resources/amp-config/recording-rules.yml'
        ]
    }
})

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .resourceProvider(ampWorkspaceName, new blueprints.CreateAmpProvider(ampWorkspaceName, ampWorkspaceName))
  .build(app, 'my-stack-name');
```

The recording rules and alerting rules files should be placed in the same repository that is using this add-on. They should also follow the same format as rules files in standalone Prometheus, like explained in [the AMP User Guide](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-ruler-rulesfile.html):

```yaml
groups:
  - name: test
    rules:
    - record: metric:recording_rule
      expr: avg(rate(container_cpu_usage_seconds_total[5m]))
  - name: alert-test
    rules:
    - alert: metric:alerting_rule
      expr: avg(rate(container_cpu_usage_seconds_total[5m])) > 0
      for: 2m
```

An example of rules configuration can be found in the data section of the [EKS monitoring rules file](https://github.com/aws-observability/terraform-aws-observability-accelerator/blob/main/modules/eks-monitoring/rules.tf) in the aws-observability repository.

Pattern #6: Configuring the [AWS Distro for OpenTelemetry Collector](https://aws-otel.github.io/docs/getting-started/collector). This pattern enables you to configure the Collector by providing a manifest describing an OpenTelemetryCollector resource:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: OpenTelemetryCollector
metadata:
  name: sidecar-for-my-app
spec:
  mode: sidecar
  config: |
    ...
    {{javaScrapeSampleLimit}}
    ...
    {{javaPrometheusMetricsEndpoint}}
```

This pattern is useful when you need to customize the configuration of the OpenTelemetryCollector, e.g. to add specific scraping targets and parameters in the Prometheus receiver configuration, for a job capturing metrics of a Java workload.

The optional `openTelemetryCollector.manifestParameterMap` parameter allows you to define a map where the keys can be used (in double curly braces) within the OpenTelemetryCollector manifest as e.g. {{javaScrapeSampleLimit}}, to be replaced by the corresponding values.

```typescript
import * as cdk from 'aws-cdk-lib';
import { CfnWorkspace } from 'aws-cdk-lib/aws-aps';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const ampWorkspaceName = "blueprints-amp-workspace";
const attrPrometheusEndpoint = blueprints.getNamedResource(ampWorkspaceName).attrPrometheusEndpoint;

const addOn = new blueprints.addons.AmpAddOn({
    ampPrometheusEndpoint: attrPrometheusEndpoint,
    openTelemetryCollector: {
        manifestPath: __dirname + '/../common/resources/otel-collector-config.yml',
        manifestParameterMap: {
            javaScrapeSampleLimit: 1000,
            javaPrometheusMetricsEndpoint: "/metrics"
        }
    }
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .resourceProvider(ampWorkspaceName, new blueprints.CreateAmpProvider(ampWorkspaceName, ampWorkspaceName))
  .build(app, 'my-stack-name');
```

If you need to configure rules, please do not use the rule_files field like in standalone Prometheus, but rather use the ampRules parameter.

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
AMP_WORKSPACE_NAME="blueprints-amp-workspace" 
# The above should be replaced with your AMP workspace name if you are passing remote write URL specified in Pattern #3.
WORKSPACE_ID=$(aws amp list-workspaces \
  --alias $AMP_WORKSPACE_NAME --region=${AWS_REGION} --query 'workspaces[0].[workspaceId]' --output text)
AMP_ENDPOINT_QUERY=https://aps-workspaces.$AWS_REGION.amazonaws.com/workspaces/$WORKSPACE_ID/api/v1/query\?query=
awscurl --service="aps" --region=${AWS_REGION} ${AMP_ENDPOINT_QUERY}up
```

## Functionality

Applies the Amazon Managed Service for Prometheus (AMP) add-on to an Amazon EKS cluster. 

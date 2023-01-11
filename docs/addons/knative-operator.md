# Knative Operator Add-On

[Knative](https://knative.dev/docs/) is an open source enterprise-grade solution to build serverless and Event Driven applications on Kubernetes.
The `Knative Operator` provides support for installing, configuring and managing Knative without using custom CRDs.

Knative Add-on supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options)

## Usage
```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOns = [
    new blueprints.addons.IstioBaseAddOn(),
    new blueprints.addons.IstioControlPlaneAddOn(),
    new blueprints.addons.KNativeOperator()
];

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .build(app, 'my-stack-name');
```

### Applying KNative Eventing
To apply KNative Eventing to a specific namespace, you can use the following YAML:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knative-eventing
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeEventing
metadata:
  name: knative-eventing
  namespace: knative-eventing
```
You can also configure KNative to ingest from specific event sources. More configuration instructions can be found in their
documentation about [event source configurations](https://knative.dev/docs/install/operator/knative-with-operators/#installing-knative-eventing-with-event-sources)


### Applying KNative Serving
To apply KNative Serving to a specific Namespace, you can use the following YAML:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knative-serving
---
apiVersion: operator.knative.dev/v1beta1
kind: KnativeServing
metadata:
  name: knative-serving
  namespace: knative-serving
```

You will have to install a networking layer and configure it to ensure KNative Serving functions properly. The [KNative 
Setup website](https://knative.dev/docs/install/operator/knative-with-operators/#install-the-networking-layer) has better
documentation.


### Applying KNative Functions
Currently, the Knative Operator does not support the deployment of Knative directly as they're directly run as services.
For better instructions check (their documentation.)[https://knative.dev/docs/functions/deploying-functions/]
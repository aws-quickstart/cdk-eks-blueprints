# Istio Control Plane Add-on

Istio is an open platform for providing a uniform way to integrate microservices, manage traffic flow across microservices, enforce policies and aggregate telemetry data. Istio's control plane provides an abstraction layer over the underlying cluster management platform, such as Kubernetes.

***IMPORTANT***:

1. This add-on depends on [Istio Base](istio-base.md) Add-on for cluster-wide resources and CRDs.

***Istio Base add-on must be present in add-on array*** and ***must be in add-on array before the Istio Control Plane add-on*** for it to work, as shown in below example. Otherwise will run into error `Assertion failed: Missing a dependency for IstioBaseAddOn`.

## Usage

Add the following as an add-on to your main.ts file to add Istio Control Plane to your cluster

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const istioBase = new blueprints.addons.IstioBaseAddOn();
const istioControlPlane = new blueprints.addons.IstioControlPlaneAddOn()

const addOns: Array<blueprints.ClusterAddOn> = [ istioBase, istioControlPlane ];

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

To validate that installation is successful run the following command:

```bash
$ kubectl get po -n istio-system
NAME                      READY   STATUS    RESTARTS   AGE
istiod-5797797b4b-fjrq2   1/1     Running   0          28m
```

## Configuration

 - `values`: Arbitrary values to pass to the chart as per https://istio.io/v1.4/docs/reference/config/installation-options/

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@edgarsilva948/eks-blueprints';

const app = new cdk.App();

const istioControlPlaneAddOnProps = {
  values: {
    pilot: {
      autoscaleEnabled: true,
      autoscaleMin: 1,
      autoscaleMax: 5,
      replicaCount: 1,
      rollingMaxSurge: "100%",
      rollingMaxUnavailable: "25%",
      resources: {
        requests: {
          cpu: "500m",
          memory: "2048Mi",
        }
      }
    }
  }
}

const istioBase = new blueprints.addons.IstioBaseAddOn();
const istioControlPlane = new blueprints.addons.IstioControlPlaneAddOn(IstioControlPlaneAddOnProps)
const addOns: Array<blueprints.ClusterAddOn> = [ istioBase, istioControlPlane ];

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(...addOns)
  .build(app, 'my-stack-name');

```

## Functionality

1. Installs Istio Control Plane deployment

# Istio Ingress Gateway Add-on

Istio is an open platform for providing a uniform way to integrate microservices, manage traffic flow across microservices, enforce policies and aggregate telemetry data. An Ingress gateway is a load balancer that handles incoming HTTP and HTTPS traffic to the mesh. It can be used to expose services to the internet, or to enable communication between services within the mesh. The Ingress gateway is implemented using a Kubernetes gateway resource and a set of Envoy proxy instances.

***IMPORTANT***:

1. This add-on depends on [Istio Base](istio-base.md) and [istio Control Plane](istio-control-plane.md) Add-ons for cluster-wide resources and CRDs.

***Istio Base add-on and Istio Control Plane addon-on must be present in add-on array*** and ***must be in add-on array before the Istio Ingress Gateway add-on*** for it to work, as shown in below example. Otherwise will run into error `Assertion failed: Missing a dependency for IstioBaseAddOn`.

## Usage

Add the following as an add-on to your main.ts file to add Istio Control Plane to your cluster

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const istioBase = new blueprints.addons.IstioBaseAddOn();
const istioControlPlane = new blueprints.addons.IstioControlPlaneAddOn()
const istioIngressGateway = new blueprints.addons.IstioIngressGatewayAddOn()

const addOns: Array<blueprints.ClusterAddOn> = [ istioBase, istioControlPlane, istioIngressGateway ];

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

To validate that installation is successful run the following command:

```bash
$ kubectl get po -n istio-system
NAME                      READY   STATUS    RESTARTS   AGE
istiod-5797797b4b-fjrq2   1/1     Running   0          28m
```

## Functionality

1. Installs Istio Ingress Gateway implements a Kubernetes gateway resource and a set of Envoy proxy instances.

# Istio Ingress Gateway Add-on

Istio is an open platform for providing a uniform way to integrate microservices, manage traffic flow across microservices, enforce policies and aggregate telemetry data. An Ingress gateway is a load balancer that handles incoming HTTP and HTTPS traffic to the mesh. It can be used to expose services to the internet, or to enable communication between services within the mesh. Istio Ingress Gateway Add-on installs Istio Ingress Gateway implementing a Kubernetes gateway resource and a set of Envoy proxy instances.

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
$ kubectl get all -n istio-system
NAME                                  READY   STATUS    RESTARTS   AGE
pod/ingressgateway-686c75b54c-qgmd4   1/1     Running   0          4m25s
pod/istiod-6c7b79d8cc-mwk4c           1/1     Running   0          4m43s

NAME                     TYPE           CLUSTER-IP       EXTERNAL-IP                                                              PORT(S)                                      AGE
service/ingressgateway   LoadBalancer   172.20.141.148   a2b87c2b0a6d64bfe9e99b29308ae0ad-449071982.us-east-1.elb.amazonaws.com   15021:30586/TCP,80:32662/TCP,443:30891/TCP   4m25s
service/istiod           ClusterIP      172.20.237.63    <none>                                                                   15010/TCP,15012/TCP,443/TCP,15014/TCP        4m43s

NAME                             READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ingressgateway   1/1     1            1           4m25s
deployment.apps/istiod           1/1     1            1           4m43s

NAME                                        DESIRED   CURRENT   READY   AGE
replicaset.apps/ingressgateway-686c75b54c   1         1         1       4m25s
replicaset.apps/istiod-6c7b79d8cc           1         1         1       4m43s

NAME                                                 REFERENCE                   TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
horizontalpodautoscaler.autoscaling/ingressgateway   Deployment/ingressgateway   2%/80%    1         5         1          4m25s
horizontalpodautoscaler.autoscaling/istiod           Deployment/istiod           0%/80%    1         5         1          4m43s
```

## Functionality

1. Istio Ingress Gateway Add-on installs Istio Ingress Gateway implementing a Kubernetes gateway resource and a set of Envoy proxy instances.

# AWS App Mesh Add-on

[AWS App Mesh](https://aws.amazon.com/app-mesh/) is a service mesh that provides application-level networking to make it easy for your services to communicate with each other across multiple types of compute infrastructure. The App Mesh add-on provisions the necessary AWS resources and Helm charts into an EKS cluster that are needed to support App Mesh for EKS workloads. 

Full documentation on using App Mesh with EKS [can be found here](https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AppMeshAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Functionality

1. Creates an App Mesh IAM service account.
2. Adds both `AWSCloudMapFullAccess` and `AWSAppMeshFullAccess` roles to the service account.
3. Adds `AWSXRayDaemonWriteAccess` to the instance role if XRay integration is enabled.
4. Creates the `appmesh-system` namespace.
5. Deploys the [`appmesh-controller`](https://github.com/aws/eks-charts/tree/master/stable/appmesh-controller) Helm chart into the cluster.
6. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

## App Mesh Sidecar Injection

You can configure certain namespaces for automatic injection of App Mesh sidecar (Envoy) proxy. This will enable handling cross-cutting aspects such as service to service communication, resiliency patterns (circuit breaker/retries) as well handle ingress and egress for the workloads running in the namespace.

Here is an example of a team with a namespace configured for automatic sidecar injection:

```typescript
export class TeamBurnham extends ApplicationTeam {
    constructor(scope: Construct) {
        super({
            name: "burnham",
            users: getUserArns(scope, "team-burnham.users"),
            namespaceAnnotations: {
                "appmesh.k8s.aws/sidecarInjectorWebhook": "enabled"
            }
        });
    }
}
```

## Tracing Integration

App Mesh integrates with a number of tracing providers for distributed tracing support. At the moment it supports AWS X-Ray, Jaeger, and Datadog providers. 
The X-Ray integration at present requires either a managed node group or a self-managed auto-scaling group backed by EC2. Fargate is not supported. 

Enabling integration:

```typescript
const appMeshAddOn = new blueprints.AppMeshAddOn({
  enableTracing: true, 
  tracingProvider: "x-ray"
}),
```

When configured, App Mesh will automatically inject an XRay sidecar to handle tracing which enables troubleshooting latency issues.

## App Mesh and XRay Integration Example

`team-burnham` sample workload repository is configured with an [example workload](https://github.com/aws-samples/eks-blueprints-workloads/tree/main/teams/team-burnham/dev) that demonstrates a "meshified" workload.

After the workload is deployed with ArgoCD or applied directly to the cluster, a [DJ application](https://github.com/aws/aws-app-mesh-examples/tree/main/examples/apps/djapp) will be created in the `team-burnham` namespace, similar to the one used for the [EKS Workshop](https://www.eksworkshop.com/intermediate/330_app_mesh/). It was adapted for GitOps integration with Blueprints and relies on automatic sidecar injection as well as tracing integration with App Mesh.

After the workload is deployed you can generate some traffic to populated traces:

```bash
$ export DJ_POD_NAME=$(kubectl get pods -n team-burnham -l app=dj -o jsonpath='{.items[].metadata.name}')
$ kubectl -n team-burnham exec -it ${DJ_POD_NAME} -c dj bash
$ while true; do
  curl http://jazz.team-burnham.svc.cluster.local:9080/
  echo
  curl http://metal.team-burnham.svc.cluster.local:9080/
  echo
done
```

The above script will start producing load which will generate traces with XRay. Once traces are produced (for a minute or more) you can navigate to the AWS XRay console and click on Service Map. 

You will see a screenshot similar to this:

![App Mesh XRay Service Map](./../assets/images/appmesh-xray.png)
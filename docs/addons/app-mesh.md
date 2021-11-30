# AWS App Mesh add-on

 [AWS App Mesh](https://aws.amazon.com/app-mesh/) is a service that monitors and controls AWS services. The App Mesh add-on provisions the necessary AWS resources and helm charts into an Amazon EKS cluster that are required to support App Mesh for EKS workloads. For more information, see [Getting started with AWS App Mesh and Kubernetes](https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html).

## Usage

```typescript
import { AppMeshAddOn, ClusterAddOn, EksBlueprint }  from '@aws-quickstart/ssp-amazon-eks';

const appMeshAddOn = new AppMeshAddOn();
const addOns: Array<ClusterAddOn> = [ appMeshAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## AWS App Mesh sidecar injection

You can configure certain namespaces for automatic injection of an AWS App Mesh sidecar (Envoy) proxy. This enables cross-cutting aspects, such as service-to-service communication and resiliency patterns (circuit breaker/retries) as well as inbound and outbound traffic for workloads that run in the namespace.

The following is an example of a team with a namespace configured for automatic sidecar injection:

```typescript
export class TeamBurnhamSetup extends ApplicationTeam {
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
## Tracing integration

AWS App Mesh integrates with tracing providers for distributed tracing support. At the moment, it supports AWS X-Ray, Jaeger, and Datadog. The X-Ray integration currently requires either a managed node group or a self-managed, auto-scaling group that is backed by Amazon Elastic Compute Cloud (Amazon EC2). AWS Fargate is not supported. 

Enable the integration:

```typescript
const appMeshAddOn = new ssp.AppMeshAddOn({enableTracing: true, tracingProvider: "x-ray"}),
```

When configured, AWS App Mesh injects an AWS X-Ray sidecar to handle tracing for troubleshooting latency issues.

## AWS App Mesh and AWS X-Ray integration example

The `team-burnham` sample repository is configured with an [example workload](https://github.com/aws-samples/ssp-eks-workloads/tree/master/teams/team-burnham/dev) that uses meshed workloads with SSP. 

After your workload is bootstrapped using Argo CD or applied directly to the cluster in the `team-burnham` namespace, the workload creates a [DJ App](https://github.com/aws/aws-app-mesh-examples/tree/main/examples/apps/djapp) that's similar to the one used for the [Amazon EKS Workshop](https://www.eksworkshop.com/intermediate/330_app_mesh/). The workload was adapted to integrate GitOps with SSP and relies on automatic sidecar injection and traces the integration through AWS App Mesh.

After the workload deploys, generate traffic to populated traces. The following script uses AWS X-Ray to produce traces:

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

When traces are produced (after about a minute), navigate to the [AWS X-Ray console](https://console.aws.amazon.com/xray/home?), and choose **Service map**. You should see the following screenshot:

![App Mesh X-Ray Service Map](/assets/images/appmesh-xray.png)

## Functionality

1. Creates an IAM service account for AWS App Mesh.
2. Adds both `AWSCloudMapFullAccess` and `AWSAppMeshFullAccess` roles to the service account.
3. If AWS X-Ray integration is enabled, adds `AWSXRayDaemonWriteAccess` to the instance role.
4. Creates the `appmesh-system` namespace.
5. Deploys the [`appmesh-controller`](https://github.com/aws/eks-charts/tree/master/stable/appmesh-controller) helm chart into the cluster.

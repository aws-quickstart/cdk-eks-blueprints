# Kubernetes NGINX Ingress Add-on

This add-on installs [Kubernetes NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx) on Amazon EKS. Kubernetes NGINX ingress controller uses NGINX as a reverse proxy and load balancer.

Other than handling Kubernetes ingress objects, this ingress controller can facilitate multi-tenancy and segregation of workload ingresses based on host name (host-based routing) and/or URL Path (path-based routing).

***IMPORTANT***:
This add-on depends on [AWS Load Balancer Controller](aws-load-balancer-controller.md) Add-on in order to enable NLB support.

***AWS Load Balancer Controller add-on must be present in add-on array*** and ***must be in add-on array before the NGINX ingress controller add-on*** for it to work, as shown in below example. Otherwise will run into error `Assertion failed: Missing a dependency for AwsLoadBalancerControllerAddOn`.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const externalDnsHostname = ...;
const awsLbControllerAddOn = new blueprints.addons.AwsLoadBalancerControllerAddOn();
const IngressNginxAddOn = new blueprints.addons.IngressNginxAddOn({ externalDnsHostname });
const addOns: Array<blueprints.ClusterAddOn> = [ awsLbControllerAddOn, IngressNginxAddOn ];

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

To validate that the installation is successful, run the following command:

```bash
$ kubectl get po -n kube-system
NAME                                                              READY   STATUS    RESTARTS   AGE
k8s-ingress-ingress-nginx-controller-75886597f6-n9qnn   1/1     Running   0          119m   1/1     Running   0          4d10h
```

Note that the ingress controller is deployed in the `kube-system` namespace.

Once deployed, it allows applications to create ingress objects and use host-based routing with external DNS support, if the External DNS Add-on is installed.

## Configuration

- `backendProtocol`: Indication for AWS Load Balancer controller with respect to the protocol supported on the load balancer. TCP by default.
- `crossZoneEnabled`: Whether to create a cross-zone load balancer with the service that backs NGINX.
- `internetFacing`: Whether the created load balancer is internet-facing. Defaults to `true` if not specified. An internal load balancer is provisioned if set to `false`.
targetType: `ip` or `instance mode`. Defaults to `ip`, which requires VPC-CNI and has better performance by eliminating a hop through kube-proxy. Instance mode leverages traditional NodePort mode on the instances.
- `externaDnsHostname`: Used in conjunction with the external DNS add-on to handle automatic registration of the service with Route 53.
- `values`: Arbitrary values to pass to the chart as per <https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/>

## DNS Integration and Routing

If the [External DNS Add-on](../addons/external-dns.md) is installed, it is possible to configure the Kubernetes NGINX ingress with an external NLB load balancer and leverage wild-card DNS domains (and public certificate) to route external traffic to individual workloads.

The following example provides support for AWS Load Balancer Controller, External DNS, and Kubernetes NGINX add-ons to enable such routing:

```typescript
blueprints.EksBlueprint.builder()
    // Register hosted zone1 under the name of MyHostedZone1
    .resourceProvider("MyHostedZone1",  new blueprints.DelegatingHostedZoneProvider({
        parentDomain: 'myglobal-domain.com',
        subdomain: 'dev.myglobal-domain.com', 
        parentAccountId: parentDnsAccountId,
        delegatingRoleName: 'DomainOperatorRole',
        wildcardSubdomain: true
    }))
    .addOns(new blueprints.addons.ExternalDnsAddOn({
        hostedZoneProviders: ["MyHostedZone1"]
    }))
    .addOns(new blueprints.IngressNginxAddOn({ 
        internetFacing: true, 
        backendProtocol: "tcp", 
        externalDnsHostname: subdomain, 
        crossZoneEnabled: false 
    }))
    .version("auto")
    .build(...);
```

Assuming the subdomain in the above example is `dev.my-domain.com` and wildcard is enabled for the external DNS add-on, customers can now create ingress objects for host-based routing. Let's define an ingress object for `team-riker` that is currently deploying the guestbook application with no ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
  name: ingress-riker
  namespace: team-riker
spec:
  rules:
  - host: riker.dev.my-domain.com
    http:
      paths:
      - backend:
          service:
            name: guestbook-ui
            port:
              number: 80
        path: /
        pathType: Prefix
```

A similar ingress may be defined for `team-troi`, routing to the workloads deployed by that team:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
  name: ingress-troi
  namespace: team-troi
spec:
  rules:
  - host: troi.dev.my-domain.com
    http:
      paths:
      - backend:
          service:
            name: guestbook-ui
            port:
              number: 80
        path: /
        pathType: Prefix
```

After the above ingresses are applied (ideally through a GitOps engine), you can now navigate to the specified hosts respectively:

`http://riker.dev.my-domain.com`
`http://troi.dev.my-domain.com`

## TLS Termination and Certificates

You can configure the Kubernetes NGINX add-on to terminate TLS at the load balancer and supply an ACM certificate through the platform blueprint.

A certificate can be registered using a named [resource provider](../resource-providers/index.md).

For convenience, the framework provides a couple of common certificate providers:

**Import Certificate**

This case is used when a certificate is already created and you just need to reference it with the blueprint stack:

```typescript
const myCertArn = "";
blueprints.EksBlueprint.builder()
    .resourceProvider(GlobalResources.Certificate, new ImportCertificateProvider(myCertArn, "cert1-id"))
    .addOns(new IngressNginxAddOn({
        certificateResourceName: GlobalResources.Certificate,
        externalDnsHostname: 'my.domain.com'
    }))
    .teams(...)
    .version("auto")
    .build(app, 'stack-with-cert-provider');
```

**Create Certificate**

This approach is used when a certificate should be created with the blueprint stack. In this case, the new certificate requires DNS validation, which can be accomplished automatically if the corresponding Route 53 hosted zone is provisioned (either along with the stack or separately) and registered as a resource provider.

```typescript
blueprints.EksBlueprint.builder()
    .resourceProvider(GlobalResources.HostedZone ,new ImportHostedZoneProvider('hosted-zone-id1', 'my.domain.com'))
    .resourceProvider(GlobalResources.Certificate, new CreateCertificateProvider('domain-wildcard-cert', '*.my.domain.com', GlobalResources.HostedZone)) // referencing hosted zone for automatic DNS validation
    .addOns(new AwsLoadBalancerControllerAddOn())
    // Use hosted zone for External DNS
    .addOns(new ExternalDnsAddOn({ hostedZoneResources: [GlobalResources.HostedZone] }))
    // Use certificate registered before with IngressNginxAddOn
    .addOns(new IngressNginxAddOn({
        certificateResourceName: GlobalResources.Certificate,
        externalDnsHostname: 'my.domain.com'
    }))
    .teams(...)
    .version("auto")
    .build(app, 'stack-with-resource-providers');
```

## Managing Multiple Ingress Controllers with IngressClasses

The IngressNginxAddOn leverages the Kubernetes NGINX Ingress Controller, which supports using IngressClasses to avoid conflicts. Here's how you can set up and use IngressClasses to manage multiple Ingress controllers effectively.

**Using IngressClasses with IngressNginxAddOn**
To deploy multiple instances of the NGINX Ingress controller, grant them control over different IngressClasses and select the appropriate IngressClass using the ingressClassName field in your Ingress resources. The IngressNginxAddOn simplifies this setup by allowing you to define these parameters directly.

### Add-on Configuration Example**

```typescript
const IngressNginxAddOn = new blueprints.addons.IngressNginxAddOn({
    crossZoneEnabled: true,
    internetFacing: true,
    targetType: 'ip',
    externalDnsHostname: myDomainName,
    certificateResourceName: blueprints.GlobalResources.Certificate,
    ingressClassName: 'internal-nginx',
    controllerClass: 'k8s.io/internal-ingress-nginx',
    electionId: 'ingress-controller-leader-internal'
});
```

**Helm Chart Values**
The add-on configuration sets up the necessary values for the Helm chart:

```typescript
const values: Values = {
    controller: {
        service: {
            annotations: presetAnnotations
        },
        ingressClassResource: {
            name: props.ingressClassName || "nginx",
            enabled: true,
            default: props.isDefaultClass ?? false,
            controllerValue: props.controllerClass || "k8s.io/ingress-nginx"
        },
        electionID: props.electionId || "ingress-controller-leader"
    }
};
```

## Benefits

- Service Annotations: Customize the Kubernetes Service resource exposing the NGINX ingress controller for better control over AWS integrations.
- Ingress Class Resource: Manage multiple Ingress configurations by specifying different ingress classes, ensuring proper routing and avoiding conflicts.
- Election ID: Ensure high availability and reliability by using a unique election ID for each controller instance, avoiding conflicts between multiple instances.

## Differences between Kubernetes NGINX Ingress Controller and NGINX Inc. Ingress Controller

The Kubernetes NGINX Ingress Controller and the NGINX Inc. Ingress Controller both use NGINX, but they have different implementations and configurations:

1. Repository Source:

Kubernetes NGINX: Available at [kubernetes/ingress-nginx](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/).
NGINX Inc.: Available at [nginxinc/kubernetes-ingress](https://kubernetes.github.io/ingress-nginx/deploy/).

1. Configuration and Features:

Kubernetes NGINX: More commonly used within the Kubernetes community, with extensive community support and documentation.
NGINX Inc.: Provided by NGINX Inc., potentially with enterprise features and different configurations.

1. Annotations and Settings:

Kubernetes NGINX: May have different annotations and settings specific to Kubernetes community practices.
NGINX Inc.: May offer additional enterprise-grade features and require different annotations. 

1. Support and Updates:

Kubernetes NGINX: Community-supported with frequent updates based on community contributions.
NGINX Inc.: Officially supported by NGINX Inc., with potential access to enterprise support and updates.

## Functionality

1. Installs Kubernetes NGINX ingress controller
2. Provides convenience options to integrate with AWS Load Balancer Controller to leverage NLB for the load balancer
3. Provides convenience options to integrate with External DNS add-on for integration with Amazon Route 53
4. Allows configuring TLS termination at the load balancer provisioned with the add-on
5. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options)

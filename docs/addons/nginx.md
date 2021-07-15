# NGINX Add-on

This add-on installs [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/deploy/) on Amazon EKS. NGINX ingress controller is using [NGINX](https://www.nginx.org/) as a reverse proxy and load balancer. 

Other than handling Kubernetes ingress objects, this ingress controller can facilitate multi-tenancy and segregation of workload ingresses based on host name (host-based routing) and/or URL Path (path based routing). 

## Usage

NGINX add-on is a standard SSP add-on and it is usage is similar to the rest of the add-ons.

```typescript
import { NginxAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const subdomain  = ...;
const nginxAddOn = new NginxAddOn(({ 
    internetFacing: true, 
    backendProtocol: "tcp", 
    externaDnsHostname: subdomain, 
    crossZoneEnabled: false 
}));

const addOns: Array<ClusterAddOn> = [ nginxAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

To validate that installation is successful run the following command:

```bash
$ kubectl get po -n kube-system
NAME                                                              READY   STATUS    RESTARTS   AGE
ssp-addon-nginx-ingress-78b8567p4q6   1/1     Running   0          4d10h
```

Note that the ingress is deployed in the `kube-system` namespace.

Once deployed, it allows applications to create ingress objects and use host based routing with external DNS support, if External DNS Add-on is installed.

## Configuration

 - `backendProtocol`: indication for AWS Load Balancer controller with respect to the protocol supported on the load balancer. TCP by default.

 - `crossZoneEnabled`: whether to create a cross-zone load balancer with the service that backs NGINX.

 - `internetFacing`: whether the created load balancer is internet facing. Defaults to `true` if not specified. Internal load balancer is provisioned if set to `false`

 -  `targetType`: `IP` or `instance` mode. Defaults to `IP` which requires VPC-CNI and has better performance eliminating a hop through kubeproxy. Instance mode leverages traditional NodePort mode on the instances. 
 
 - `externaDnsHostname`: Used in conjunction with the external DNS add-on to handle automatic registration of the service with Route53. 

 - `values`: Arbitrary values to pass to the chart as per https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#

## DNS Integration and Routing

If [External DNS Add-on](../addons/external-dns.md) is installed, it is possible to configure NGINX ingress with an external NLB load balancer and leverage wild-card DNS domains (and public certificate) to route external traffic to individual workloads. 

The following example provides support for AWS Load Balancer controller, External DNS and NGINX add-ons to enable such routing:

```typescript
const wildcardDomain = true;
const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.AwsLoadBalancerControllerAddOn,
            new ssp.addons.ExternalDnsAddon({
                hostedZone: new ssp.addons.DelegatingHostedZoneProvider(
                    parentDomain,
                    subdomain, 
                    parentDnsAccountId,
                    'DomainOperatorRole', 
                    wildcardDomain
                )
            }),
            new ssp.NginxAddOn({ internetFacing: true, backendProtocol: "tcp", externaDnsHostname: subdomain, crossZoneEnabled: false })
        ];
```

Assuming the subdomain in the above example is `dev.my-domain.com` and wilcard is enabled for the external DNS add-on customers can now create ingress objects for host-based routing. Let's define an ingress object for `team-riker` that is currently deploying guestbook application with no ingress:

```yaml
apiVersion: extensions/v1beta1
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
          serviceName: guestbook-ui
          servicePort: 80
        path: /
        pathType: Prefix
```

A similar ingess may be defined for `team-troi` routing to the workloads deployed by that team:

```yaml
apiVersion: extensions/v1beta1
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
          serviceName: guestbook-ui
          servicePort: 80
        path: /
        pathType: Prefix
```

After the above ingresses applied (ideally through a GitOps engine) you can now navigate to the specified hosts respectively:

[http://riker.dev.my-domain.com](http://riker.dev.my-domain.com)
[http://troi.dev.my-domain.com](http://troi.dev.my-domain.com)

## Functionality

1. Installs NGINX ingress controller
2. Provides convenience options to integrate with AWS Load Balancer controller to leverage NLB for the load balancer
3. Provides convenience options to integrate with External DNS add-on for integration with Amazon Route 53. 
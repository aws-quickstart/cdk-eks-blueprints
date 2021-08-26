# NGINX Add-on

This add-on installs [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/deploy/) on Amazon EKS. NGINX uses [NGINX](https://www.nginx.org/) as a reverse proxy and load balancer. Other than handling Kubernetes inbound objects, this controller facilitates multitenancy and workload segregation, based on host name (host-based routing) and/or URL path (path-based routing). 

## Usage

NGINX is a standard SSP add-on that is similar in usage to the other add-ons in this guide.

```typescript
import { NginxAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const subdomain  = ...;
const nginxAddOn = new NginxAddOn(({ 
    externaDnsHostname: subdomain
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

To verfify that your installation is successful, run the following command:

```bash
$ kubectl get po -n kube-system
NAME                                                              READY   STATUS    RESTARTS   AGE
ssp-addon-nginx-ingress-78b8567p4q6   1/1     Running   0          4d10h
```

Note that NGINX Ingress Controller deploys in the `kube-system` namespace. When  deployed, applications can create inbound objects and use host-based routing with External DNS support (assumes the External DNS add-on is installed).

## Configuration

 - `backendProtocol`: Indication for AWS Load Balancer controller with respect to the protocol supported on the load balancer. TCP by default.
 - `crossZoneEnabled`: Whether to create a cross-zone load balancer with the service that backs NGINX.
 - `internetFacing`: Creates a load balancer that is internet facing. The default value is `true`. The load balancer is provisioned if you set this value to `false`.
 -  `targetType`: `IP` or `instance` mode. The default values is `IP`, which requires VPC CNI and eliminates the need for Kube-proxy. The instance mode uses the traditional `NodePort` mode on instances. 
 - `externaDnsHostname`: Used in conjunction with the [External DNS add-on](./external-dns.md) to handle automatic registration of the service through Amazon Route 53. 
 - `values`: Passes arbitrary values to helm charts. For more information, see [Installation with Helm](https://docs.nginx.com/nginx-ingress-controller/installation/installation-with-helm/#).

## DNS integration and routing

If [External DNS](../addons/external-dns.md) is installed, you can configure NGINX Ingress Controller with an external Network Load Balancer and use wild-card DNS domains (and public certificates) to route external traffic to individual workloads. 

The following example enables routing support for the load balancer, External DNS, and NGINX add-ons:

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

Assuming that the subdomain in the previous example is `dev.my-domain.com` and wilcards are enabled for External DNS, you can create inbound objects for host-based routing. The following code defines an inbound object for `team-riker` that deploys a guestbook application with no inbound traffic:

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

You can create a similar inbound object for `team-troi`, which routes to the deployed workloads:

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

After you apply the inbound rules (ideally, through a GitOps engine), navigate to your specified hosts:

[http://riker.dev.my-domain.com](http://riker.dev.my-domain.com)
[http://troi.dev.my-domain.com](http://troi.dev.my-domain.com)

## Functionality

1. Installs [NGINX Ingress Controller](https://docs.nginx.com/nginx-ingress-controller/).
2. Provides integration options for Network Load Balancers.
3. Provides options to integrate External DNS with Amazon Route 53. 
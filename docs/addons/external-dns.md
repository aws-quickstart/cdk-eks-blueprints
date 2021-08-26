# External DNS Add-on

The External DNS add-on is based on the [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) open-source project and integrates exposed Kubernetes services and inbound traffic from DNS providers, in particular [Amazon Route 53](https://aws.amazon.com/route53/). The add-on also provides functionality for configuring IAM policies and Kubernetes service accounts for Route 53 integration support. For more information, see [Setting up ExternalDNS for Services on AWS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md).

## Usage

```typescript
import * as ssp from '@shapirov/cdk-eks-blueprint';

readonly externalDns = new ssp.addons.ExternalDnsAddon({
    hostedZone: new ssp.addons.LookupHostedZoneProvider(myHostedZoneName)
});

const addOns: Array<ClusterAddOn> = [ externalDns ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```
To validate that External DNS is running, ensure that the add-on status is `RUNNING`:

```bash
# Assuming add-on is installed in the external-dns namespace.
$ kubectl get po -n external-dns
NAME                           READY   STATUS    RESTARTS   AGE
external-dns-fcf6c9c66-xd8f4   1/1     Running   0          3d3h
```

You can now provision external services and inboud traffic using Amazon Route 53. For example, to provision a Network Load Balancer, use the following service manifest:

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout: '60'
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    external-dns.alpha.kubernetes.io/hostname: <MyDomainName>
  name: udp-test1
spec:
  type: LoadBalancer
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    name: your-app
```

Note the `external-dns.alpha.kubernetes.io/hostname` annotation for the service name. This allows you to specify its domain name. 

## Hosted-zone providers

For External DNS to work, you must provide one or more hosted zones. To either create or look up the hosted zones, you must have a reference to the Amazon EKS stack. To help customers handle common use cases for Amazon Route 53, the framework provides a few providers. 

**Name look-up and direct import provider:**
This provider allows you to bind to an existing hosted zone, based on its name.

```typescript
    const myDomainName = ""
    new ssp.addons.ExternalDnsAddon({
        hostedZone: new ssp.addons.LookupHostedZoneProvider(myDomainName);
    })
```

If the hosted-zone ID is known, use `ImportHostedZoneProvider`, which bypasses any lookup calls.

```typescript
    const myHostedZoneId = ""
    new ssp.addons.ExternalDnsAddon({
        hostedZone: new ssp.addons.ImportHostedZoneProvider(myDomainName);
    })
```

**Delegating a hosted-zone provider**

In many cases, enterprises choose to decouple provisioning of root domains and subdomains. A common pattern is to have a specific DNS account (AWS account) that hosts the root domain, while subdomains are created within individual workload accounts. This implies cross-account access from child accounts to parent DNS accounts for subdomain delegation. 

Prerequisites:

1. The parent account defines an IAM role with the following managed policies:
`AmazonRoute53DomainsFullAccess`
`AmazonRoute53ReadOnlyAccess`
`AmazonRoute53AutoNamingFullAccess`

2. Create a trust relationship between this role and the child account that is expected to add subdomains. For more information, see [IAM tutorial: Delegate access across AWS accounts using IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html).

Example:

Assume that the parent DNS account `parentAccountId` has a domain named `myglobal-domain.com`. When an SSP EKS cluster is provisioned in this domain, use a stage-specific name such as `dev.myglobal-domain.com` or `test.myglobal-domain.com`. In addition to these requirements, enable tenant-specific access to the domains, such as `my-tenant1.dev.myglobal-domain.com` or team-specific access `team-riker.dev.myglobal-domain.com`. 

The following is a summary of this setup:

1. In `parentAccountId`, you create a role for delegation (`DomainOperatorRole` in this example) and a trust relationship to the child account in which SSP EKS blueprint is provisioned. Generally, the number of child accounts can be large, so each of them must be listed in the trust relationship.
2. In `parentAccountId`, you create a public hosted zone for `myglobal-domain.com`. 
//TODO Unsure what the following sentence means.
The setup that may require separate automation (or manual processes) is complete. 
3. Use the following add-on configuration:

```typescript
const useWildcardDomain = true
readonly externalDns = new ssp.addons.ExternalDnsAddon({
    hostedZone: new ssp.addons.DelegatingHostedZoneProvider({
        parentDomain: 'myglobal-domain.com',
        subdomain: 'dev.myglobal-domain.com', 
        parentAccountId: parentDnsAccountId,
        delegatingRoleName: 'DomainOperatorRole', 
        wildcardSubdomain: useWildcardDomain
    })
});
```

When `useWildcardDomain` is set to `true`, the add-on creates a CNAME for `*.dev.myglobal-domain.com`. At the moment, this is used for host-based routing within EKS (e.g., with NGINX inbound traffic).

## Configuration options

   - `namespace`: Optional target namespace where an add-on is installed. Do not change this value on the operating cluster. By default, it is set to `external-dns`.
   - `version`: Add-on uses a Bitnami helm chart. This parameter allows you to override the helm chart version.
   - `hostedZone`: An interface that provides one or more hosted zones that the add-on uses for the service and inbound configuration.

## Functionality

This applies the External DNS configuration for the DNS provider. For more information, see [Setting up ExternalDNS for Services on AWS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md).
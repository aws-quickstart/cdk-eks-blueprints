# External DNS Add-on

External DNS add-on is based on the [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) open source project and allows integration of exposed Kubernetes services and Ingresses with DNS providers, in particular [Amazon Route 53](https://aws.amazon.com/route53/).

The add-on provides functionality to configure IAM policies and Kubernetes service accounts for Route 53 integration support based on [AWS Tutorial for External DNS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md).

## Usage

```typescript
import * as ssp from '@shapirov/cdk-eks-blueprint';

readonly externalDns = new ssp.addons.ExternalDnsAddon({
    hostedZone: new ssp.addons.DelegatingHostedZoneProvider(
        parentDomain,
        subdomain, 
        parentDnsAccountId,
        'DomainOperatorRole', 
        true
    )
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
To validate that external DNS add-on is running ensure that the add-on deployment is in `RUNNING` state:

```bash
# Assuming add-on is installed in the external-dns namespace.
$ kubectl get po -n external-dns
NAME                           READY   STATUS    RESTARTS   AGE
external-dns-fcf6c9c66-xd8f4   1/1     Running   0          3d3h
```

You can now provision external services and ingresses integrating with Route 53. 
For example to provision an NLB you can use the following service manifest:

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

Note the `external-dns.alpha.kubernetes.io/hostname` annotation for the service name that allows specifying its domain name. 

## Hosted Zone Providers

In order for external DNS to work, you need to supply one or more hosted zones. You need a reference to the EKS stack in order to either create or look up the hosted zones. 

To help customers handle common use cases for Route 53 provisioning the platform provides a few convenience providers. 

**Name look-up and direct import provider:**
This provider will allow to bind to an existing hosted zone based on its name.

```typescript
    const myDomainName = ""
    new ssp.addons.ExternalDnsAddon({
        hostedZone: new ssp.addons.LookupHostedZoneProvider(myDomainName);
    })
```

If the hosted zone ID is known, then the recommended approach is to use a `ImportHostedZoneProvider` which bypasses any lookup calls.

```typescript
    const myHostedZoneId = ""
    new ssp.addons.ExternalDnsAddon({
        hostedZone: new ssp.addons.ImportHostedZoneProvider(myDomainName);
    })
```

**Delegating Hosted Zone Provider**

In many cases, enterprises choose to decouple provisioning of root domains and subdomains. A common pattern is to have a specific DNS account (AWS account) hosting the root domain, while subdomains may be created within individual workload accounts. 

This implies cross-account access from child account to the parent DNS account for subdomain delegation. 

Prerequisites:

1. Parent account defines an IAM role with the following managed policies:
`AmazonRoute53DomainsFullAccess`
`AmazonRoute53ReadOnlyAccess`
`AmazonRoute53AutoNamingFullAccess`

2. Create trust relationship between this role and the child account that is expected to add subdomains. For info see [IAM tutorial](https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html).

Example:

Let's assume that parent DNS account `parentAccountId` has domain named `myglobal-domain.com`. Now when provisioned an SSP EKS cluster you would like to use a stage specific name like `dev.myglobal-domain.com` or `test.myglobal-domain.com`. In addition to these requirements, you would like to enable tenant specific access to those domains such as `my-tenant1.dev.myglobal-domain.com` or team specific access `team-riker.dev.myglobal-domain.com`. 

The setup will look the following way:

1. In the `parentAccountId` account you create a role for delegation (`DomainOperatorRole` in this example) and a trust relationship to the child account in which SSP EKS blueprint will be provisioned. In a general case, the number of child accounts can be large, so each of them will have to be listed in the trust relationship.
2. In the `parentAccountId` you create a public hosted zone for `myglobal-domain.com`. With that the setup that may require separate automation (or a manual process) is complete. 
3. Use the following configuration of the add-on:

```typescript
const useWildcardDomain = true
readonly externalDns = new ssp.addons.ExternalDnsAddon({
    hostedZone: new ssp.addons.DelegatingHostedZoneProvider(
        'myglobal-domain.com',
        'dev.myglobal-domain.com', 
        parentAccountId,
        'DomainOperatorRole', 
        useWildcardDomain
    )
});
```

The parameter `useWildcardDomain` above when set to true will also create a CNAME for `*.dev.myglobal-domain.com`. This is at the moment used for host based routing within EKS (e.g. with NGINX ingress).



## Configuration Options

See description below:

```typescript
    /**
     * Target namespace where add-on will be installed. Changing this value on the operating cluster is not recommended. 
     * @default `external-dns`
     */
    readonly namespace?: string;

    /**
     * The add-on is leveraging a Bitnami helm chart. This parameter allows overriding the helm chart version used.
     * @default `5.1.3`
     */
    readonly version?: string;

   /**
    * Hosted zone provider is a function that returns one or more hosted zone that the add-on will leverage for the service and ingress configuration.
    */ 
    readonly hostedZone: HostedZoneProvider;
```

## Functionality

Applies External-DNS configuration for AWS DNS provider. See [AWS Tutorial for External DNS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md) for more information.
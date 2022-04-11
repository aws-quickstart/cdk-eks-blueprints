# External DNS Add-on

External DNS add-on is based on the [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) open source project and allows integration of exposed Kubernetes services and Ingresses with DNS providers, in particular [Amazon Route 53](https://aws.amazon.com/route53/).

The add-on provides functionality to configure IAM policies and Kubernetes service accounts for Route 53 integration support based on [AWS Tutorial for External DNS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const hostedZoneName = ...

const addOn = new blueprints.addons.ExternalDnsAddOn({
    hostedZoneProviders: [hostedZoneName]; // can be multiple
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .resourceProvider(hostedZoneName, new blueprints.addons.LookupHostedZoneProvider(hostedZoneName))
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

To validate that external DNS add-on is running ensure that the add-on deployment is in `RUNNING` state:

```bash
# Assuming add-on is installed in the external-dns namespace.
$ kubectl get po -n external-dns
NAME                           READY   STATUS    RESTARTS   AGE
external-dns-fcf6c9c66-xd8f4   1/1     Running   0          3d3h
```

## Using External DNS
You can now provision external services and ingresses integrating with Route 53. For example to provision an NLB you can use the following service manifest:

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

In order for external DNS to work, you need to supply one or more hosted zones. Hosted zones are expected to be supplied leveraging [resource providers](../resource-providers/index.md).

To help customers handle common use cases for Route 53 provisioning the framework provides a few convenience providers that can be registered with the EKS Blueprint Stack. 

**Name look-up and direct import provider:**
This provider will allow to bind to an existing hosted zone based on its name.

```typescript
const myDomainName = "";

blueprints.EksBlueprint.builder()
    //  Register hosted zone1 under the name of MyHostedZone1
    .resourceProvider("MyHostedZone1", new blueprints.LookupHostedZoneProvider(myDomainName))
    .addOns(new blueprints.addons.ExternalDnsAddOn({
        hostedZoneProviders: ["MyHostedZone1"];
    })
    .build(...);
```

If the hosted zone ID is known, then the recommended approach is to use a `ImportHostedZoneProvider` which bypasses any lookup calls.

```typescript
const myHostedZoneId = "";
blueprints.EksBlueprint.builder()
    //  Register hosted zone1 under the name of MyHostedZone1
    .resourceProvider("MyHostedZone1",  new blueprints.addons.ImportHostedZoneProvider(myHostedZoneId))
    .addOns(new blueprints.addons.ExternalDnsAddOn({
        hostedZoneProviders: ["MyHostedZone1"];
    })
    .build(...);
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

Let's assume that parent DNS account `parentAccountId` has domain named `myglobal-domain.com`. Now when provisioned an EKS Blueprints cluster you would like to use a stage specific name like `dev.myglobal-domain.com` or `test.myglobal-domain.com`. In addition to these requirements, you would like to enable tenant specific access to those domains such as `my-tenant1.dev.myglobal-domain.com` or team specific access `team-riker.dev.myglobal-domain.com`. 

The setup will look the following way:

1. In the `parentAccountId` account you create a role for delegation (`DomainOperatorRole` in this example) and a trust relationship to the child account in which EKS Blueprints will be provisioned. In a general case, the number of child accounts can be large, so each of them will have to be listed in the trust relationship.
2. In the `parentAccountId` you create a public hosted zone for `myglobal-domain.com`. With that the setup that may require separate automation (or a manual process) is complete. 
3. Use the following configuration of the add-on:

```typescript

blueprints.EksBlueprint.builder()
    //  Register hosted zone1 under the name of MyHostedZone1
    .resourceProvider("MyHostedZone1",  new blueprints.DelegatingHostedZoneProvider({
        parentDomain: 'myglobal-domain.com',
        subdomain: 'dev.myglobal-domain.com', 
        parentAccountId: parentDnsAccountId,
        delegatingRoleName: 'DomainOperatorRole',
        wildcardSubdomain: true
    })
    .addOns(new blueprints.addons.ExternalDnsAddOn({
        hostedZoneProviders: ["MyHostedZone1"];
    })

```

The parameter `wildcardSubdomain` above when set to true will also create a CNAME for `*.dev.myglobal-domain.com`. This is at the moment used for host based routing within EKS (e.g. with NGINX ingress).


## Configuration Options

   - `namespace`: Optional target namespace where add-on will be installed. Changing this value on the operating cluster is not recommended. Set to `external-dns` by default.
   - `version`: The add-on is leveraging a Bitnami helm chart. This parameter allows overriding the helm chart version used.
   - `hostedZone`: Hosted zone provider is a interface that provides one or more hosted zones that the add-on will leverage for the service and ingress configuration.

## Functionality

1. Applies External-DNS configuration for AWS DNS provider. See [AWS Tutorial for External DNS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md) for more information.
2. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).
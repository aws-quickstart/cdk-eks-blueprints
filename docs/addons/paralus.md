# Paralus Amazon EKS Addon

The Paralus project is a free open-source tool that enables controlled audited access to Kubernetes infrastructure. It comes with just-in-time service account creation and user-level credential management that integrates with your existing RBAC and SSO providers of choice. Learn more by visiting the offical documentation page: <https://www.paralus.io/>

Paralus Blueprint Addon deploys paralus controller on your EKS cluster using [paralus construct](https://github.com/aws-samples/cdk-eks-blueprints-patterns/tree/main/lib/paralus-construct) implemented with the EKS Blueprints [CDK](https://aws.amazon.com/cdk/). Detailed documentation on the same can be accessed from [here](https://github.com/aws-samples/cdk-eks-blueprints-patterns/blob/main/docs/patterns/paralus.md).

The Paralus AddOn deploys the following resources:

- Creates a single EKS cluster with a public endpoint (for demo purpose only) that includes a managed node group
- Deploys supporting AddOn:  AwsLoadBalancerController, VpcCni, KubeProxy, EbsCsiDriverAddOn
- Deploy Paralus on the EKS cluster

**NOTE: Paralus installs a few dependent modules such as Postgres, Kratos, and also comes with a built-in dashboard. At it's core, Paralus works atop domain-based routing, inter-service communication, and supports the AddOns mentioned above.**

## These features makes Kubernetes RBAC management centralized with a seamless experience

- Creation of custom [roles, users, and groups](https://www.paralus.io/docs/usage/roles).
- Dynamic and immediate changing and revoking of permissions.
- Ability to control access via [pre-configured roles](https://www.paralus.io/docs/usage/) across clusters, namespaces, projects, and more.
- Seamless integration with [Identity Providers (IdPs)](https://www.paralus.io/docs/single-sign-on/) allowing the use of external authentication engines for users and group definitions, such as GitHub, Google, Azure AD, Okta, and others.
- [Automatic logging](https://www.paralus.io/docs/usage/audit-logs) of all user actions performed for audit and compliance purposes.
- Interact with Paralus either with a modern web GUI (default), a CLI tool called [pctl](https://www.paralus.io/docs/usage/cli), or [Paralus API](https://www.paralus.io/docs/references/api-reference).
  
<p align="center">
  <a href="https://paralus.io">
    <img alt="Kubernetes Goat" src="https://raw.githubusercontent.com/paralus/paralus/main/paralus.gif" width="600" />
  </a>
</p>

## Prerequisite

You must have a domain and access to updating it's DNS records as paralus works atop domain based routing. If you need to create a domain using Amazon Route53, follow [these](https://aws.amazon.com/getting-started/hands-on/get-a-domain/) instructions to get started.

## Usage

Run the following command to install the paralus-eks-blueprints-addon dependency in your project.

```sh
npm i @paralus/paralus-eks-blueprints-addon
```

# Sample EKS Blueprint using Paralus addon

```typescript
import { App } from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { ParalusAddOn } from '../dist';

const app = new App();

blueprints.EksBlueprint.builder()
     .addOns(
        new blueprints.AwsLoadBalancerControllerAddOn(),
        new blueprints.VpcCniAddOn(),
        new blueprints.KubeProxyAddOn(),
        new blueprints.EbsCsiDriverAddOn(),
        new blueprints.CertManagerAddOn(),
        new ParalusAddOn({
         namespace: 'paralus-system',
         /**
         * Values to pass to the chart as per https://github.com/paralus/helm-charts/blob/main/charts/ztka/values.yaml.
         */
         // update this to your domain, as paralus works based on domain based routing
         values: {
            fqdn: {
                "domain": "yourdomain.com",
                "hostname": "console-eks",
                "coreConnectorSubdomain": "*.core-connector.eks",
                "userSubdomain": "*.user.eks"
            }        
         }
     }))
     .teams()
     .build(app, 'paralus-test-blueprint');
```

## AddOn Options

| Option                  | Description                                         | Default                       |
|-------------------------|-----------------------------------------------------|-------------------------------|
| `deploy.contour.enable`                | Deploy and use Contour as the default ingress                                | true                            |
| `deploy.kratos.enable`                | Deploy and use Kratos                                | true                            |
| `deploy.postgresql.enable`  | Deploy and use postgres database             | false                            |
| `deploy.postgresql.dsn`  | DSN of your existing postgres database for paralus to use             | ""                            |
| `deploy.fluentbit.enable`       | Deploy and use fluentbit for auditlogs with database storage    | ""                            |
| `paralus.initialize.adminEmail`       | Admin email to access paralus    | "<admin@paralus.local>"                            |
| `paralus.initialize.org`             | Organization name using paralus    | "ParalusOrg"                     |
| `auditLogs.storage`               | Default storage of auditlogs               | "database"                     |
| `fqdn.domain`               | Root domain               | "paralus.local"                     |
| `fqdn.hostname`               | subdomain used for viewing dashboard               | "console"                     |
| `fqdn.coreConnectorSubdomain`               | a wildcard subdomain used for controller cluster to target cluster communication               | "*.core-connector"                     |
| `fqdn.userSubdomain`               | a wildcard subdomain used for controller cluster to end user communication               | "*.user"                     |
| `values`                | Configuration values passed to the chart. [See options](https://github.com/paralus/helm-charts/tree/main/charts/ztka#values). | {}                            |

## Configure DNS Settings

Once Paralus is installed continue with following steps to configure DNS settings, reset default password and start using paralus

Obtain the external ip address by executing below command against the installation
`kubectl get svc blueprints-addon-paralus-contour-envoy -n paralus-system`

```sh
NAME                            TYPE           CLUSTER-IP       EXTERNAL-IP                                                                     PORT(S)                         AGE
blueprints-addon-paralus-contour-envoy         LoadBalancer   10.100.101.216   a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com   80:31810/TCP,443:30292/TCP      10m
```

Update the DNS settings to add CNAME records

```sh
    name: console-eks 
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
    
    name: *.core-connector.eks  
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
    
    name: *.user.eks 
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
```

Obtain your default password and reset it upon first login

`kubectl logs -f --namespace paralus-system $(kubectl get pods --namespace paralus-system -l app.kubernetes.io/name='paralus' -o jsonpath='{ .items[0].metadata.name }') initialize | grep 'Org Admin default password:'`

You can now access dashboard with <http://console-eks.yourdomain.com> ( refers to the hostname.domain specified during installation ), start importing clusters and using paralus.

Note: you can also refer to this [paralus eks blogpost](https://www.paralus.io/blog/eks-quickstart#configuring-dns-settings)

## Support

If you have any questions about Paralus, get in touch with the team [on Slack](https://join.slack.com/t/paralus/shared_invite/zt-1a9x6y729-ySmAq~I3tjclEG7nDoXB0A).

Paralus is maintained and supported by [Rafay](https://rafay.co)

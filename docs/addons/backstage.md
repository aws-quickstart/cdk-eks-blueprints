# [TODO: update before merge into main] Backstage Amazon EKS Blueprints AddOn

## Setup

Crete the [Backstage application](https://backstage.io/docs/getting-started/create-an-app).

Build [Docker image](https://backstage.io/docs/deployment/docker)

Note, to show examples on the UI, add to Docker file:

```
COPY --chown=node:node examples /examples
```

Create ECR registry and repository

```console
aws ecr get-login-password --region {region} | docker login --username AWS --password-stdin {account}.dkr.ecr.{region}.amazonaws.com
docker tag {the new image id here} {account}.dkr.ecr.{region}.amazonaws.com/{repository}:latest
docker push {account}.dkr.ecr.{region}.amazonaws.com/{repository}:latest
```

Backstage requires HTTPS. This setup assumes you will be using the subdomain {youralias}.people.aws.dev, delegated as per [Supernova guidelines](https://w.amazon.com/bin/view/SuperNova/PreOnboardingSteps/), from [this page](https://supernova.amazon.dev/)

Setup a Hosted Zone in Route 53 (e.g. {youralias}.people.aws.dev)

Create _A_ record (e.g. backstage.{youralias}.people.aws.dev) in the Hosted Zone created above, with "Route traffic to": the Load Balancer created by the Backstage add-on

Create a certificate in ACM for backstage.{youralias}.people.aws.dev

Setup PosgreSQL database manually, in the cluster VPC, with security group allowing incoming traffic from the EKS cluster

Clone this EKS Blueprints repo and branch

run the following commands:

```console
npm i
make build
make lint
npm pack
```

[Create a CDK project](https://catalog.workshops.aws/eks-blueprints-for-cdk/en-US/030-single-eks-cluster/031-create-a-cluster/1-create-a-cdk-project)

To use the EKS Blueprints repo and branch in your project, run:

```console
npm install —save ../{your blueprins dir}/{blueprints module}.tgz
```

Edit the .ts file under /bin as follows, and update the variables below with your values:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { Construct } from 'constructs';
import { DelegatingHostedZoneProvider, CreateCertificateProvider, ImportHostedZoneProvider, GlobalResources } from '@aws-quickstart/eks-blueprints';
import { BackstageAddOn } from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const account = '{account}';
const region = '{region}';
const backstageCertificateArn = "arn:aws:acm:...";
const backstageImageRegistry = "{account}.dkr.ecr.{region}.amazonaws.com";
const backstageImageRepository = "backstage-addon";
const backstageImageTag = "latest";
const backstageBaseUrl = "http://backstage.{youralias}.people.aws.dev";
const backstagePostgresHost = "...rds.amazonaws.com";
const backstagePostgresPassword = "{db pw}";

const subdomain: string = "{subdomain}.{parent domain}";
const parentDnsAccountId = account;
const parentDomain = "{parent domain}";
const hostedZoneId = "{id}";
const certificateResourceName = GlobalResources.Certificate;

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.ArgoCDAddOn(),
  new blueprints.CalicoOperatorAddOn(),
  new blueprints.MetricsServerAddOn(),
  new blueprints.ClusterAutoScalerAddOn(),
  new blueprints.AwsLoadBalancerControllerAddOn(),
  new blueprints.VpcCniAddOn(),
  new blueprints.CoreDnsAddOn(),
  new blueprints.KubeProxyAddOn(),
  new blueprints.ExternalDnsAddOn({
    hostedZoneResources: [blueprints.GlobalResources.HostedZone]
  }),
  new BackstageAddOn({
    subdomain: subdomain,
    certificateResourceName: certificateResourceName,
    imageRegistry: backstageImageRegistry,
    imageRepository: backstageImageRepository,
    imageTag: backstageImageTag,
    baseUrl: backstageBaseUrl,
    postgresHost: backstagePostgresHost,
    postgresPassword: backstagePostgresPassword,
  })
];

const blueprint = blueprints.EksBlueprint.builder()
.account(account)
.region(region)
.resourceProvider(GlobalResources.HostedZone, new ImportHostedZoneProvider(hostedZoneId, parentDomain))
.resourceProvider(certificateResourceName, new blueprints.CreateCertificateProvider("elb-certificate", subdomain, GlobalResources.HostedZone))
.addOns(...addOns)
.teams()
.build(app, 'backstage-addon-eks-blueprints');
```
## TODO

We need to remove as much manual, off-band setup as possible:
- Database creation in the cluster VPC
- Database connectivity from cluster in a secure way, e.g.
    - create security groups for Backstage pods and database and setup inbound rule on the database SG?
    - use IRSA?
- ~~Create _A_ record from cdk, including ALB referencing~~

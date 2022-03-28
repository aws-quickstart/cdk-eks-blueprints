# Pixie Addon

The `Pixie Addon` deploys [Pixie](https://px.dev) on Amazon EKS using the EKS Blueprints [CDK](https://aws.amazon.com/cdk/). 

Pixie is an open source observability tool for Kubernetes applications. Use Pixie to view the high-level state of your cluster (service maps, cluster resources, application traffic) and also drill-down into more detailed views (pod state, flame graphs, individual full-body application requests).

Three features enable Pixie's magical developer experience:

- **Auto-telemetry:** Pixie uses eBPF to automatically collect telemetry data such as full-body requests, resource and network metrics, application profiles, and more. See the full list of data sources [here](https://docs.px.dev/about-pixie/data-sources/).

- **In-Cluster Edge Compute:** Pixie collects, stores and queries all telemetry data locally in the cluster. Pixie uses less than 5% of cluster CPU, and in most cases less than 2%.

- **Scriptability:** [PxL](https://docs.px.dev/reference/pxl/), Pixie’s flexible Pythonic query language, can be used across Pixie’s UI, CLI, and client APIs.

## Prerequisite

You must have either:

- You need to have a Pixie account and deployment key on [Community Cloud for Pixie](https://withpixie.ai).

- Or a Pixie account and deployment key on a [self-hosted Pixie Cloud](https://docs.px.dev/installing-pixie/install-guides/self-hosted-pixie/).

## Usage

Run the following command to install the pixie-eks-blueprints-addon dependency in your project.

```
npm i @pixie-labs/pixie-eks-blueprints-addon
```

#### Using deploy key:

```
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { PixieAddOn } from '@pixie-labs/pixie-ssp-addon';

const app = new App();

const addOns: Array<blueprints.ClusterAddOn> = [
    new PixieAddOn({
    	deployKey: 'pixie-deploy-key', // Create and copy from Pixie Admin UI
    }),
];

new blueprints.EksBlueprint(
    app, 
    {
        id: 'my-stack-name', 
        addOns,
    },
    {
        env:{
          account: <AWS_ACCOUNT_ID>,
          region: <AWS_REGION>, 
        }       
    });
```

#### Using deploy key stored in Secrets Manager:

```
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { PixieAddOn } from '@pixie-labs/pixie-ssp-addon';

const app = new App();

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.SecretsStoreAddOn,
    new PixieAddOn({
        deployKeySecretName: "pixie-deploy-key-secret", // Name of secret in Secrets Manager. 
    }),
];

new blueprints.EksBlueprint(
    app,
    {
        id: 'my-stack-name',
        addOns,
    },
    {
        env:{
          account: <AWS_ACCOUNT_ID>,
          region: <AWS_REGION>,
        }
    });
```

## Addon Options (props)

#### `deployKey: string` (optional)

Pixie deployment key (plain text).  Log into the Admin UI in Pixie to generate a deployment key. This attaches your Pixie deployment to your org.

#### `deployKeySecretName: string` (optional)

The name of the Pixie deployment key secret in Secrets Manager. The value of the key in Secrets Manager should be the deploy key in plaintext. Do not nest it inside a JSON object.

#### `namespace?: string` (optional)

Namespace to deploy Pixie to. Default: `pl`

#### `cloudAddr?: string` (optional)

The address of Pixie Cloud. This should only be modified if you have deployed your own self-hosted Pixie Cloud. By default, it will be set to [Community Cloud for Pixie](https://work.withpixie.dev).

#### `devCloudNamespace?: string` (optional)

If running in a self-hosted cloud with no DNS configured, the namespace in which the self-hosted cloud is running. 

#### `clusterName?: string` (optional)

The name of cluster. If none is specified, a random name will be generated.

#### `useEtcdOperator?: boolean` (optional)

Whether the metadata store should use etcd to store metadata, or use a persistent volume store. If not specified, the operator will deploy based on the cluster's storageClass configuration.

#### `pemMemoryLimit?: string` (optional)

The memory limit applied to the PEMs (data collectors). Set to 2Gi by default.

#### `dataAccess?: "Full"|"Restricted"|"PIIRestricted"` (optional)

DataAccess defines the level of data that may be accesssed when executing a script on the cluster. If none specified, assumes full data access.

#### `patches?: [key: string]: string` (optional)

Custom K8s patches which should be applied to the Pixie YAMLs. The key should be the name of the K8s resource, and the value is the patch that should be applied.

#### `version?: string` (optional)

Helm chart version.

#### `repository?: string`, `release?: string`, `chart?: string` (optional)

Additional options for customers who may need to supply their own private Helm repository.



# Import Cluster Provider

The `ImportClusterProvider` allows you to import an existing EKS cluster into your blueprint. Importing an existing cluster at present will allow adding certain add-ons and limited team capabilities. 

## Usage 

The framework provides a couple of convenience methods to instantiate the `ImportClusterProvider` by leveraging the SDK API call to describe the cluster. 

### Option 1

Recommended option is to get the cluster information through the `DescribeCluster` API (requires `eks:DescribeCluster` permission at build-time) and then use it to instantiate the `ImportClusterProvider` and **(very important)** to set up the blueprint VPC. 

Make sure VPC is set to the VPC of the imported cluster, otherwise the blueprint by default will create a new VPC, which will be redundant and cause problems with some of the add-ons. 

**Note:** `blueprints.describeCluster() is an asynchronous function, you should either use `await` or handle promise resolution chain. 

```typescript
const clusterName = "quickstart-cluster";
const region = "us-east-2";

const sdkCluster = await blueprints.describeCluster(clusterName, region); // get cluster information using EKS APIs

/**
 * Assumes the supplied role is registered in the target cluster for kubectl access.
 */
const importClusterProvider = blueprints.ImportClusterProvider.fromClusterAttributes(
    sdkCluster, 
    blueprints.getResource(context => new blueprints.LookupRoleProvider(kubectlRoleName).provide(context))
);

const vpcId = sdkCluster.resourcesVpcConfig?.vpcId;

blueprints.EksBlueprint.builder()
    .clusterProvider(importClusterProvider)
    .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(vpcId)) // this is required with import cluster provider

```

### Option 2

This option is convenient if you already know the VPC Id of the target cluster. It also requires `eks:DescribeCluster` permission at build-time:

```typescript
const clusterName = "quickstart-cluster";
const region = "us-east-2";

const kubectlRole: iam.IRole = blueprints.getNamedResource('my-role');

const importClusterProvider2 = await blueprints.ImportClusterProvider.fromClusterLookup(clusterName, region, kubectlRole); // note await here

const vpcId = ...; // you can always get it with blueprints.describeCluster(clusterName, region);

blueprints.EksBlueprint.builder()
    .clusterProvider(importClusterProvider2)
    .resourceProvider('my-role', new blueprints.LookupRoleProvider('my-role'))
    .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(vpcId)) 
```

### Option 3 

Unlike the other options, this one does not require any special permissions at build time, however it requires passing all the required information to the import cluster provider. 
OIDC provider is expected to be passed in as well if you are planning to leverage IRSA with your blueprint. The OIDC provider is expected to be registered in the imported cluster already, otherwise IRSA won't work.


```typescript

const importClusterProvider3 = new ImportClusterProvider({
    clusterName: 'my-existing-cluster',
    version: KubernetesVersion.V1_26,
    clusterEndpoint: 'https://B792B88BC60999B1A37D.gr7.us-east-2.eks.amazonaws.com',
    openIdConnectProvider: getResource(context =>
        new LookupOpenIdConnectProvider('https://oidc.eks.us-east-2.amazonaws.com/id/B792B88BC60999B1A37D').provide(context)),
    clusterCertificateAuthorityData: 'S0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCasdd234................',
    kubectlRoleArn: 'arn:...',
});

const vpcId = ...; 

blueprints.EksBlueprint.builder()
    .clusterProvider(importClusterProvider3)
    .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(vpcId)) 
```

## Configuration

The `ImportClusterProvider` supports the following configuration options:

| Prop                  | Description |
|-----------------------|-------------|
| clusterName           | Cluster name
| version               | EKS version of the target cluster
| clusterEndpoint       | The API Server endpoint URL
| openIdConnectProvider | An Open ID Connect provider for this cluster that can be used to configure service accounts. You can either import an existing provider using `LookupOpenIdConnectProvider`, or create a new provider using new custom resource provider to call `new eks.OpenIdConnectProvider`
| clusterCertificateAuthorityData  | The certificate-authority-data for your cluster.
| kubectlRoleArn                   | An IAM role with cluster administrator and "system:masters" permissions.


## Known Limitations

The following add-ons will not work with the `ImportClusterProvider` due to the inability (at present) of the imported clusters to modify `aws-auth` ConfigMap and mutate cluster authentication:
* `ClusterAutoScalerAddOn`
* `AwsBatchAddOn`
* `EmrEksAddOn`
* `KarpenterAddOn`

Teams can be added to the cluster and will perform all of the team functionality except cluster access due to the same inability to mutate cluster access. 

At the moment, there are no examples to add extra capacity to the imported clusters like node groups. 
# Fargate Cluster Provider

The `FargateClusterProvider` allows you to provision an EKS cluster which runs Kubernetes pods on [AWS Fargate](https://docs.aws.amazon.com/eks/latest/userguide/fargate.html). To create a Fargate cluster, you must provide [Fargate Profiles](https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html), which allows cluster operators to specify which Pods should be run on Fargate.

## Usage 

In the example below, the Fargate profile indicates that all Pods in the `dynatrace` namespace should run on Fargate.

```typescript
const fargateProfiles: Map<string, eks.FargateProfileOptions> = new Map([
    ["dynatrace", { selectors: [{ namespace: "dynatrace" }] }]
]);

const clusterProvider = new blueprints.FargateClusterProvider({ fargateProfiles });
new blueprints.EksBlueprint(scope, { id: 'blueprint', [], [], clusterProvider });
```

## Configuration

`FargateClusterProvider` supports the following configuration options. 

| Prop                  | Description |
|-----------------------|-------------|
| name                  | The name for the cluster.
| fargateProfiles       | A map of Fargate profiles to use with the cluster.
| vpcSubnets            | The subnets for the cluster.
| privateCluster        | Public cluster, you will need to provide a list of subnets. There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html)
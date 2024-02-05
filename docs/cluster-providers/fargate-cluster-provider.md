# Fargate Cluster Provider

The `FargateClusterProvider` allows you to provision an EKS cluster which runs Kubernetes pods on [AWS Fargate](https://docs.aws.amazon.com/eks/latest/userguide/fargate.html). To create a Fargate cluster, you must provide [Fargate Profiles](https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html), which allows cluster operators to specify which Pods should be run on Fargate.

## Usage

In the example below, the Fargate profile indicates that all Pods in the
`dynatrace` namespace having the label `example.com/fargate` set to `true` (the
string, not the boolean value) should run on Fargate. (The label may be omitted
if you want all Pods in the namespace to run on Fargate.)

```typescript
const fargateProfiles = {
    dynatrace: {
        selectors: [
            {
                namespace: 'dynatrace',
                labels: { // optional
                    'example.com/fargate': 'true'
                }
            }
        ]
    }
};
const tags = {
    "Name": "blueprints-example-cluster",
    "Type": "fargate-cluster"
}
const clusterProvider = new blueprints.FargateClusterProvider({
    version: KubernetesVersion.V1_28,
    fargateProfiles,
    tags
});

new blueprints.EksBlueprint(scope, { id: 'blueprint', [], [], clusterProvider });
```

## Configuration

`FargateClusterProvider` supports the following configuration options.

| Prop                  | Description |
|-----------------------|-------------|
| name                  | The name for the cluster.
| version               | Kubernetes version for the control plane. Required in cluster props or blueprint props.
| fargateProfiles       | A map of Fargate profiles to use with the cluster.
| vpcSubnets            | The subnets for the cluster.
| tags                  | Tags to propagate to Cluster.
| privateCluster        | Public cluster, you will need to provide a list of subnets. There should be public and private subnets
for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html)

You can find more details on the supported configuration options in the API documentation for the [FargateClusterProviderProps](../api/interfaces/clusters.FargateClusterProviderProps.html).

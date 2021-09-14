# Amzon EC2 cluster provider

To provision an EKS cluster, use `EC2ClusterProvider`, which leverages [EKS managed node groups (MNGs)](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html) for compute capacity. MNGs automate the provisioning and lifecycle management of nodes (Amazon EC2 instances) for Amazon EKS Kubernetes clusters.

## Usage 

```typescript
const props: EC2ProviderClusterProps = {
    minSize: 1,
    maxSize: 10,
    desiredSize: 4,
    instanceTypes: [ew InstanceType('m5.large')],
    amiType: NodegroupAmiType.AL2_X86_64,
    nodeGroupCapacityType: CapacityType.ON_DEMAND,
    version: KubernetesVersion.V1_20,
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
const clusterProvider = new ssp.EC2ClusterProvider(props);
new ssp.EksBlueprint(scope, { id: 'blueprint', teams, addOns, clusterProvider });
```

## Configuration

`EC2ClusterProvider` supports the following configuration options. 

| Property                | Description |
|-------------------------|-------------|
| `minSize`               | Minimum cluster size must be a positive integer greater than 0 (the default is 1).
| `maxSize`               | Maximum cluster size must be greater than `minSize` (the default is 3).
| `desiredSize`           | Desired cluster size must be greater or equal to `minSize` (the default is `min-size`).
| `instanceTypes`         | Type of instance for the EKS cluster, must be a valid instance type, i.e., `t3.medium` (the default is `m5.large`).
| `amiType`               | AMI type for the managed node group.
| `amiReleaseVersion`     | AMI Kuberenetes release version for the node group.
| `nodeGroupCapacityType` | Capacity type for the node group (on demand or spot).
| vpcSubnets              | Subnets for the cluster.
| privateCluster          | Public cluster that provides a list of subnets. There should be public and private subnets for your EKS cluster to work. For more information, see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).

Configurations can also be supplied via context variables (specified as `cdk.json`, `cdk.context.json`, and `~/.cdk.json`, or pass with the `-c` command-line option):

- `eks.default.min-size`
- `eks.default.max-size` 
- `eks.default.desired-size`
- `eks.default.instance-type` 
- `eks.default.private-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass `EC2ProviderClusterProps` to each cluster provider.

## Upgrading worker nodes

Upgrading your Kubernetes version through your cluster configuration does not affect the Kubelet version on worker nodes. To perform an in-place upgrade of the cluster, update the `amiReleaseVersion` property:

```typescript
const props: EC2ProviderClusterProps = {
    version: KubernetesVersion.V1_20,
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
```

Note: For more information about the AMI release that supports Kubernetes versions, see the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html).

## Creating clusters using the spot capacity type

To create clusters that use spot capacity, set the `nodeGroupCapacityType` value to `CapacityType.SPOT`.

```typescript
const props: EC2ProviderClusterProps = {
    nodeGroupCapacityType: CapacityType.SPOT,
    version: KubernetesVersion.V1_20,
    instanceTypes: [new InstanceType('t3.large'), new InstanceType('m5.large')],
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
```

Note that two attributes in this configuration are relevant for Spot: `nodeGroupCapacityType` and `instaceTypes`. The latter indicates the types of instances that can be used for spot capacity, and it makes sense to have a number of instance types to maximize availability. 
# EC2 Cluster Provider

The `EC2ClusterProvider` allows you to provision an EKS cluster which leverages [EKS managed node groups](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)(MNGs) for compute capacity. MNGs automate the provisioning and lifecycle management of nodes (Amazon EC2 instances) for Amazon EKS Kubernetes clusters.

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

THe `EC2ClusterProvider` supports the following configuration options. 

| Prop                  | Description |
|-----------------------|-------------|
| minSize               | Min cluster size, must be positive integer greater than 0 (default 1).
| maxSize               | Max cluster size, must be greater than minSize (default 3).
| desiredSize           | Desired cluster size, must be greater or equal to minSize (default `min-size`).
| instanceTypes         | Type of instance for the EKS cluster, must be a valid instance type, i.e. t3.medium (default "m5.large")
| amiType               | The AMI type for the managed node group.
| amiReleaseVersion     | The AMI Kuberenetes release version for the node group.
| nodeGroupCapacityType | The capacity type for the node group (on demand or spot).
| vpcSubnets            | The subnets for the cluster.
| privateCluster        | public cluster, you will need to provide a list of subnets. There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).

Configuration can also be supplied via context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.min-size`
- `eks.default.max-size` 
- `eks.default.desired-size`
- `eks.default.instance-type` 
- `eks.default.private-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass `EC2ProviderClusterProps` to each cluster provider.

## Upgrading Worker Nodes

Upgrading Kubernetes versions via cluster configuration at present won't impact the kubelet version running on the worker nodes. To perform an in-place upgrade of the cluster, you must also update the `amiReleaseVersion` property. The following demonstrates how to do so.

```typescript
const props: EC2ProviderClusterProps = {
    version: KubernetesVersion.V1_20,
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
```

Note: consult the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html) for information ion the AMI release version that matches Kubernetes versions.

## Creating Clusters with Spot Capacity Type

To create clusters which leverage Spot capacity, set the `nodeGroupCapacityType` value to `CapacityType.SPOT`

```typescript
const props: EC2ProviderClusterProps = {
    nodeGroupCapacityType: CapacityType.SPOT,
    version: KubernetesVersion.V1_20,
    instanceTypes: [new InstanceType('t3.large'), new InstanceType('m5.large')],
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
```

Note that two attributes in this configuration are relevant for Spot: `nodeGroupCapacityType` and `instaceTypes`. The latter indicates the types of instances which could be leveraged for Spot capacity and it makes sense to have a number of instance types to maximize availability. 
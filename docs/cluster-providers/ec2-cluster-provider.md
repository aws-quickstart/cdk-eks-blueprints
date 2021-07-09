# EC2 Cluster Provider

## Stack Configuration

Supports context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.instance-type`: Type of instance for the EKS cluster, must be a valid instance type, i.e. t3.medium (default "m5.large")
- `eks.default.min-size`: Min cluster size, must be positive integer greater than 0 (default 1).
- `eks.default.max-size`: Max cluster size, must be greater than minSize (default 3).
- `eks.default.desired-size`: Desired cluster size, must be greater or equal to minSize (default `min-size`).
- `eks.default.private-cluster`: Specifies whether to use private cluster or not (default false). Note that should you utilize public cluster, you will need to provide a list of subnets. There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass `EC2ProviderClusterProps` to each cluster provider.


## Upgrading Worker Nodes

Upgrading Kubernetes version at the cluster configuration at present won't impact the kubelet version running on the worker nodes. 
To perform an in-place upgrade of the cluster, including worker nodes use the following configuration:

```
const props: EC2ProviderClusterProps = {
    version: KubernetesVersion.V1_20,
    instanceTypes: [new InstanceType('t3.large')],
    amiType: NodegroupAmiType.AL2_X86_64,
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}

const myClusterProvider = new EC2ClusterProvider(props);

new EksBlueprint(app, { id: "test-cluster-provider", clusterProvider: myClusterProvider });
```

Note: consult the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html) for the information of the AMI release version that matches your Kubernetes version.

## Creating Clusters with Spot Capacity Type

You can specify capacity type with the cluster configuration options:

```
const props: EC2ProviderClusterProps = {
    nodeGroupCapacityType: CapacityType.SPOT,
    version: KubernetesVersion.V1_20,
    instanceTypes: [new InstanceType('t3.large'), new InstanceType('m5.large')],
    amiType: NodegroupAmiType.AL2_X86_64,
    amiReleaseVersion: "1.20.4-20210519" // this will upgrade kubelet to 1.20.4
}
```

Note two attributes in this configuration that are relevant for Spot: `nodeGroupCapacityType` and `instaceTypes`. The latter indicates the types of instances which could be leveraged for Spot capacity and it makes sense to have a number of instance types to maximize availability. 
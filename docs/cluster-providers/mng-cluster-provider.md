# Managed Node Group Cluster Provider

The `MngClusterProvider` allows you to provision an EKS cluster which leverages [EKS managed node groups](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)(MNGs) for compute capacity. MNGs automate the provisioning and lifecycle management of nodes (Amazon EC2 instances) for Amazon EKS Kubernetes clusters.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as bp from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const props: bp.MngClusterProviderProps = {
    minSize: 1,
    maxSize: 10,
    desiredSize: 4,
    instanceTypes: [new ec2.InstanceType('m5.large')],
    amiType: eks.NodegroupAmiType.AL2023_X86_64_STANDARD,
    nodeGroupCapacityType: eks.CapacityType.ON_DEMAND,
    amiReleaseVersion: "1.30.0-20240615" // this will upgrade kubelet to 1.30.0
};

const clusterProvider = new bp.MngClusterProvider(props);
new bp.EksBlueprint(app, { id: 'blueprint-1', addOns:[], teams: [], clusterProvider, version: eks.KubernetesVersion.V1_30 });
```

## Configuration

The `MngClusterProvider` supports the following configuration options.

| Prop                  | Description |
|-----------------------|-------------|
| name                  | The name for the cluster. @Deprecated
| clusterName           | Cluster name
| version               | Kubernetes version for the control plane. Required in cluster props or blueprint props.
| minSize               | Min cluster size, must be positive integer greater than 0 (default 1).
| maxSize               | Max cluster size, must be greater than minSize (default 3).
| desiredSize           | Desired cluster size, must be greater or equal to minSize (default `min-size`).
| instanceTypes         | Type of instance for the EKS cluster, must be a valid instance type, i.e. t3.medium (default "m5.large")
| amiType               | The AMI type for the managed node group.
| amiReleaseVersion     | The AMI Kubernetes release version for the node group.
| customAmi             | The custom AMI and the userData for the node group, `amiType` and `amiReleaseVersion` will be ignored if this is set.
| nodeGroupCapacityType | The capacity type for the node group (on demand or spot).
| vpcSubnets            | The subnets for the cluster.
| privateCluster        | If `true` Kubernetes API server is private.
| isolatedCluster       | If `true` EKS Cluster is configured to deploy in an isolated subnet.
| tags                  | Tags to propagate to Cluster.
| nodeGroupTags         | Tags to propagate to Node Group.

There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).

Configuration can also be supplied via context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.min-size`
- `eks.default.max-size`
- `eks.default.desired-size`
- `eks.default.instance-type`
- `eks.default.private-cluster`
- `eks.default.isolated-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass `MngClusterProviderProps` to each cluster blueprint.

You can find more details on the supported configuration options in the API documentation for the [MngClusterProviderProps](../api/interfaces/clusters.MngClusterProviderProps.html).

## Upgrading Worker Nodes

Upgrading Kubernetes versions via cluster configuration at present won't impact the kubelet version running on the worker nodes. To perform an in-place upgrade of the cluster, you must also update the `amiReleaseVersion` property. The following demonstrates how to do so.

```typescript
const props: MngClusterProviderProps = {
    version: KubernetesVersion.V1_29,
    amiReleaseVersion: "1.25.7-20230509" // this will upgrade kubelet to 1.25
}
```

Note: consult the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html) for information ion the AMI release version that matches Kubernetes versions.

## Creating Clusters with Spot Capacity Type

To create clusters which leverage Spot capacity, set the `nodeGroupCapacityType` value to `CapacityType.SPOT`

```typescript
const props: MngClusterProviderProps = {
    nodeGroupCapacityType: CapacityType.SPOT,
    version: KubernetesVersion.V1_29,
    instanceTypes: [new InstanceType('t3.large'), new InstanceType('m5.large')],
    amiReleaseVersion: "1.25.7-20230509" // this will upgrade kubelet to 1.25
}
```

Note that two attributes in this configuration are relevant for Spot: `nodeGroupCapacityType` and `instaceTypes`. The latter indicates the types of instances which could be leveraged for Spot capacity and it makes sense to have a number of instance types to maximize availability.

## Creating Clusters with custom AMI for the node group

To create clusters using custom AMI for the worker nodes, set the `customAmi` to your custom image and provide your `userData` for node bootstrapping.

```typescript
const userData = UserData.forLinux();
userData.addCommands(`/etc/eks/bootstrap.sh ${cluster.clusterName}`);

const props: MngClusterProviderProps = {
    nodeGroupCapacityType: CapacityType.ON_DEMAND,
    version: KubernetesVersion.V1_29,
    instanceTypes: [new InstanceType('t3.large')],
    customAmi: {
        machineImage: MachineImage.genericLinux({'us-east-1': 'ami-0be34337b485b2609'}),
        userData: userData,
    },
}
```

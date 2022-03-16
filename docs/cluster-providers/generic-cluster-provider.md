# Generic Cluster Provider

The `GenericClusterProvider` allows you to provision an EKS cluster which leverages one or more [EKS managed node groups](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)(MNGs), or one or more autoscaling groups[EC2 Auto Scaling groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html) for its compute capacity. Users can also configure multiple Fargate profiles along with the EC2 based compute cpacity.

## Usage 

```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_21,
    managedNodeGroups: [
        {
            id: "mng1",
            amiType: NodegroupAmiType.AL2_X86_64,
            instanceTypes: [new InstanceType('m5.2xlarge')]
        },
        {
            id: "mng2-custom",
            instanceTypes: [new InstanceType('m5.2xlarge')],
            nodeGroupCapacityType: CapacityType.SPOT,
            customAmi: {
                machineImage: ec2.MachineImage.genericLinux({
                    'us-east-1': 'ami-0b297a512e2852b89',
                    'us-west-2': 'ami-06a8c459c01f55c7b',
                    'us-east-2': 'ami-093d9796e55a5b860'
                }),
                userData: userData,
            }
        }
    ]
});

EksBlueprint.builder()
    .clusterProvider(clusterProvider)
    .build(app, blueprintID);
```

## Configuration

The `GenericClusterProvider` supports the following configuration options. 

| Prop                  | Description |
|-----------------------|-------------|
| clusterName           | The name for the cluster.
| managedNodeGroups     | Zero or more managed node groups.
| autoscalingNodeGroups | Zero or more autoscaling node groups (mutually exclusive with managed node groups).
| fargateProfiles       | Zero or more Fargate profiles.
| version               | Kubernetes version for the control plane.
| vpc                   | VPC for the cluster.
| vpcSubnets            | The subnets for control plane ENIs (subnet selection).
| privateCluster        | If `true` Kubernetes API server is private.

There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).


Default configuration for managed and autoscaling node groups can also be supplied via context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.min-size`
- `eks.default.max-size` 
- `eks.default.desired-size`
- `eks.default.instance-type` 
- `eks.default.private-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass individual `GenericProviderClusterProps` to each cluster blueprint.

## Upgrading Control Plane

Upgrading Kubernetes versions via cluster configuration at present won't impact the kubelet version running on the worker nodes. Worker nodes in-place upgrade requires explicit update of the individual node groups. The property that controls it for managed node groups is `amiReleaseVersion`. The following demonstrates how to do so.

```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_20,
    managedNodeGroups: [
        {
            id: "managed-1",
            amiType: NodegroupAmiType.AL2_X86_64,
            amiReleaseVersion: "1.20.4-20210519"
        }
    ]
});
```

Note: consult the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-linux-ami-versions.html) for information ion the AMI release version that matches Kubernetes versions.

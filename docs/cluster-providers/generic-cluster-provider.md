# Generic Cluster Provider

The `GenericClusterProvider` allows you to provision an EKS cluster which leverages one or more [EKS managed node groups](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)(MNGs), or one or more autoscaling groups[EC2 Auto Scaling groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html) for its compute capacity. Users can also configure multiple Fargate profiles along with the EC2 based compute cpacity. 

Today it is not possible for an Amazon EKS Cluster to propagate tags to EC2 instance worker nodes directly when you create an EKS cluster. You can create a launch template with custom tags on `managedNodeGroups` with `GenericClusterProvider` as shown in `mng2-launchtemplate`. This will allow you to propagate custom tags to your EC2 instance worker nodes.

Note: If `launchTemplate` is passed with `managedNodeGroups`, `diskSize` is not allowed.

# Configuration

Full list of configuration options:

- [Generic Cluster Provider](../api/interfaces/clusters.GenericClusterProviderProps.html)
- [Managed Node Group](../api/interfaces/clusters.ManagedNodeGroup.html)
- [Autoscaling Group](../api/interfaces/clusters.AutoscalingNodeGroup.html)
- [Fargate Cluster](../api/interfaces/clusters.FargateClusterProviderProps.html)

## Usage 

```typescript
const windowsUserData = ec2.UserData.forWindows();
windowsUserData.addCommands(`
    $ErrorActionPreference = 'Stop'
    $EKSBootstrapScriptPath = "C:\\\\Program Files\\\\Amazon\\\\EKS\\\\Start-EKSBootstrap.ps1"
    Try {
    & $EKSBootstrapScriptPath -EKSClusterName '<YOUR_CLUSTER_NAME>'
    } Catch {
    Throw $_
    }
`);
const ebsDeviceProps: ec2.EbsDeviceProps = {
    deleteOnTermination: false,
    volumeType: ec2.EbsDeviceVolumeType.GP2
};
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_25,
    tags: {
        "Name": "blueprints-example-cluster",
        "Type": "generic-cluster"
    },
    serviceIpv4Cidr: "10.43.0.0/16",
    // if needed use this to register an auth role integrate with RBAC
    mastersRole: blueprints.getResource(context => {
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
    }),
    managedNodeGroups: [
        {
            id: "mng1",
            amiType: NodegroupAmiType.AL2_X86_64,
            instanceTypes: [new InstanceType('m5.2xlarge')],
            desiredSize: 2,
            maxSize: 3, 
            nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            launchTemplate: {
                // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
                tags: {
                    "Name": "Mng1",
                    "Type": "Managed-Node-Group",
                    "LaunchTemplate": "Custom",
                    "Instance": "ONDEMAND"
                }
            }
        },
        {
            id: "mng2-launchtemplate",
            instanceTypes: [new ec2.InstanceType('m5.2xlarge')],
            nodeGroupCapacityType: CapacityType.SPOT,
            desiredSize: 0,
            minSize: 0,
            launchTemplate: {
                machineImage: ec2.MachineImage.genericLinux({
                    'us-east-1': 'ami-08e520f5673ee0894',
                    'us-west-2': 'ami-0403ff342ceb30967',
                    'us-east-2': 'ami-07109d69738d6e1ee',
                    'us-west-1': 'ami-07bda4b61dc470985',
                    'us-gov-west-1': 'ami-0e9ebbf0d3f263e9b',
                    'us-gov-east-1':'ami-033eb9bc6daf8bfb1'
                }),
                userData: userData,
                // You can pass Custom Tags to Launch Templates which gets propagated to worker nodes.
                tags: {
                    "Name": "Mng2",
                    "Type": "Managed-Node-Group",
                    "LaunchTemplate": "Custom",
                    "Instance": "SPOT"
                }
            }
        },
        // Below is a Managed Windows Node Group Sample.
        {
            id: "mng3-windowsami",
            amiType: NodegroupAmiType.AL2_X86_64,
            instanceTypes: [new ec2.InstanceType('m5.4xlarge')],
            desiredSize: 0,
            minSize: 0, 
            nodeRole: blueprints.getNamedResource("node-role") as iam.Role,
            launchTemplate: {
                blockDevices: [
                    {
                        deviceName: "/dev/sda1",
                        volume: ec2.BlockDeviceVolume.ebs(50, ebsDeviceProps),
                    }
                ],
            machineImage: ec2.MachineImage.genericWindows({
                'us-east-1': 'ami-0e80b8d281637c6c1',
                'us-east-2': 'ami-039ecff89038848a6',
                'us-west-1': 'ami-0c0815035bf1efb6e',
                'us-west-2': 'ami-029e1340b254a7667',
                'eu-west-1': 'ami-09af50f599f7f882c',
                'eu-west-2': 'ami-0bf1fec1eaef78230',
            }),
                securityGroup: blueprints.getNamedResource("my-cluster-security-group") as ec2.ISecurityGroup,
                tags: {
                    "Name": "Mng3",
                    "Type": "Managed-WindowsNode-Group",
                    "LaunchTemplate": "WindowsLT",
                    "kubernetes.io/cluster/<YOUR_CLUSTER_NAME>": "owned"
                },
                userData: windowsUserData,
            }
        }
    ],
    fargateProfiles: {
        "fp1": {
            fargateProfileName: "fp1",
            selectors:  [{ namespace: "serverless1" }] 
        }
    }
});

EksBlueprint.builder()
    .clusterProvider(clusterProvider)
    .build(app, blueprintID);
```


The Cluster configuration and node group configuration exposes a number of options that require to supply an actual CDK resource. 
For example cluster allows passing `mastersRole`, `securityGroup`, etc. to the cluster, while managed node group allow specifying `nodeRole`.

All of such cases can be solved with [Resource Providers](../resource-providers/index.md#using-resource-providers-with-cdk-constructs).

Example:
```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_25,
    tags: {
        "Name": "blueprints-example-cluster",
        "Type": "generic-cluster"
    },
    // if needed use this to register an auth role to integrate with RBAC
    mastersRole: blueprints.getResource(context => {
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
    }),
    securityGroup: blueprints.getNamedResource("my-cluster-security-group") as ec2.ISecurityGroup, // assumed to be register as a resource provider under name my-cluster-security-group
    managedNodeGroups: [
        {
            id: "mng1",
            nodeRole: blueprints.getResource(context => {
                const role = new iam.Role(context.scope, 'NodeRole', { assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com")});
                ... add policies such as AmazonEKSWorkerNodePolicy and AmazonEC2ContainerRegistryReadOnly 
                return role;
            })
        }
});

EksBlueprint.builder()
    .resourceProvider("my-cluster-security-group", {
        provide(context: blueprints.ResourceContext) : ec2.ISecurityGroup {
            return ec2.SecurityGroup.fromSecurityGroupId(context.scope, 'SG', 'sg-12345', { mutable: false }); // example for look up
        }
    })
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
| version               | Kubernetes version for the control plane. Required in cluster props or blueprint props.
| vpc                   | VPC for the cluster.
| vpcSubnets            | The subnets for control plane ENIs (subnet selection).
| privateCluster        | If `true` Kubernetes API server is private.
| tags                  | Tags to propagate to Cluster.

There should be public and private subnets for EKS cluster to work. For more information see [Cluster VPC Considerations](https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html).


Default configuration for managed and autoscaling node groups can also be supplied via context variables (specify in cdk.json, cdk.context.json, ~/.cdk.json or pass with -c command line option):

- `eks.default.min-size`
- `eks.default.max-size` 
- `eks.default.desired-size`
- `eks.default.instance-type` 
- `eks.default.private-cluster`

Configuration of the EC2 parameters through context parameters makes sense if you would like to apply default configuration to multiple clusters without the need to explicitly pass individual `GenericProviderClusterProps` to each cluster blueprint.

You can find more details on the supported configuration options in the API documentation for the [GenericClusterProviderProps](../api/interfaces/clusters.GenericClusterProviderProps.html).

## Upgrading Control Plane

Upgrading Kubernetes versions via cluster configuration at present won't impact the kubelet version running on the worker nodes. Worker nodes in-place upgrade requires explicit update of the individual node groups. The property that controls it for managed node groups is `amiReleaseVersion`. The following demonstrates how to do so.

```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_25,
    managedNodeGroups: [
        {
            id: "managed-1",
            amiType: NodegroupAmiType.AL2_X86_64,
            amiReleaseVersion: "1.20.4-20210519"
        }
    ]
});
```

Note: consult the [official EKS documentation](https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html) for information ion the AMI release version that matches Kubernetes versions.

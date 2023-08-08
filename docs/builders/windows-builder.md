# Windows Builder

The `WindowsBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with windows to run your windows workloads.

## Input Parameters

`WindowsOptions` which takes inputs to `WindowsBuilder` supports following parameters:

- `kubernetesVersion` : Required field, Kubernetes version to use for the cluster
- `instanceClass`: Required field, Instance class to use for the cluster
- `instanceSize`:  Required field, Instance size to use for the cluster
- `desiredNodeSize`: Required field, Desired number of nodes to use for the cluster
- `minNodeSize`: Required field, Minimum number of nodes to use for the cluster
- `maxNodeSize`: Required field, Maximum number of nodes to use for the cluster
- `blockDeviceSize`: Required field, Block device size
- `noScheduleForWindowsNodes`: Optional field, No Schedule for Windows Nodes
- `clusterProviderTags`: Required field, Cluster Provider Tags
- `genericNodeGroupTags`: Required field, Generic Node Group Tags
- `windowsNodeGroupTags`: Required field, Windows Node Group Tags.

### Demonstration - Building Windows on EKS Cluster

The below usage helps you with a demonstration to use `WindowsBuilder` to configure a required setup as you prepare a blueprint for setting up windows nodes on a new EKS cluster.

```typescript
import * as blueprints from "@aws-quickstart/eks-blueprints";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { WindowsBuilder, WindowsOptions } from '../common/windows-builder';
import { WindowsVpcCni } from "./vpc-cni";

export default class WindowsConstruct {
    build(scope: Construct, id: string) {
        const account = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;
        const stackID = `${id}-eks-blueprint`;

        const nodeRole = new blueprints.CreateRoleProvider("blueprint-node-role", new iam.ServicePrincipal("ec2.amazonaws.com"),
            [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy")
            ]);

        const options: WindowsOptions = {
            kubernetesVersion: eks.KubernetesVersion.of("1.27"),
            instanceClass: ec2.InstanceClass.M5,
            instanceSize: ec2.InstanceSize.XLARGE4,
            desiredNodeSize: 2,
            minNodeSize: 2,
            maxNodeSize: 3,
            blockDeviceSize: 50,
            noScheduleForWindowsNodes: true,
            clusterProviderTags: {
                "Name": "blueprints-windows-eks-cluster",
                "Type": "generic-windows-cluster"
            },
            genericNodeGroupTags: {
                "Name": "Mng-linux",
                "Type": "Managed-linux-Node-Group",
                "LaunchTemplate": "Linux-Launch-Template",
            },
            windowsNodeGroupTags: {
                "Name": "Managed-Node-Group",
                "Type": "Windows-Node-Group",
                "LaunchTemplate": "WindowsLT",
                "kubernetes.io/cluster/windows-eks-blueprint": "owned"  
            }
        };

        const addOns: Array<blueprints.ClusterAddOn> = [
            new WindowsVpcCni()
        ];

        WindowsBuilder.builder(options)
            .addOns(...addOns)
            .account(account)
            .region(region)
            .resourceProvider("node-role", nodeRole)
            .resourceProvider(
                blueprints.GlobalResources.Vpc,
                new blueprints.VpcProvider()
            )
            .build(scope, stackID);
    }
}

```


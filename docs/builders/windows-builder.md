# Windows Builder

The `WindowsBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with windows to run your windows workloads. 

The `WindowsBuilder` creates the following:
- An EKS Cluster` with passed k8s version and cluster tags.
- A non-windows nodegroup for standard software with parameters passed.
- A windows nodegroup to schedule windows workloads with parameters passed.

## Input Parameters

`WindowsOptions` which takes inputs to `WindowsBuilder` supports following parameters:

- `kubernetesVersion` : Required field, Kubernetes version to use for the cluster
- `instanceClass`: Required field, Instance class to use for the cluster
- `instanceSize`:  Required field, Instance size to use for the cluster
- `nodeRole`: optional, Node IAM Role to be attached to Windows and Non-windows nodes.
- `windowsAmiType`: Required field, AMI Type for Windows Nodes. For example `WINDOWS_FULL_2022_X86_64`.
- `desiredNodeSize`: Optional field, Desired number of nodes to use for the cluster
- `minNodeSize`: Optional field, Minimum number of nodes to use for the cluster
- `maxNodeSize`: Optional field, Maximum number of nodes to use for the cluster
- `blockDeviceSize`: Optional field, Block device size
- `noScheduleForWindowsNodes`: Optional field, No Schedule for Windows Nodes, this allows Windows nodes to be marked as no-schedule by default to prevent any linux workloads from scheduling.
- `clusterProviderTags`: Optional field, Cluster Provider Tags
- `genericNodeGroupTags`: Optional field, Generic Node Group Tags for non-windows nodes which run standard cluster software.
- `windowsNodeGroupTags`: Optional field, Windows Node Group Tags.

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
            kubernetesVersion: eks.KubernetesVersion.of("1.28"),
            instanceClass: ec2.InstanceClass.M5,
            instanceSize: ec2.InstanceSize.XLARGE4
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

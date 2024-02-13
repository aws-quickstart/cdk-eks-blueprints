# GPU Builder

The `GpuBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with GPU Operator to run your GPU workloads. 

The `GpuBuilder` creates the following:
- An EKS Cluster` with passed k8s version and cluster tags.
- A nodegroup to schedule GPU workloads with parameters passed.

## Input Parameters

`GpuOptions` which takes inputs to `GpuBuilder` supports following parameters:

- `kubernetesVersion` : Required field, Kubernetes version to use for the cluster
- `instanceClass`: Required field, Instance class to use for the cluster
- `instanceSize`:  Required field, Instance size to use for the cluster
- `nodeRole`: optional, Node IAM Role to be attached to nodes.
- `gpuAmiType`: Required field, AMI Type for GPU Nodes. For example `AL2_X86_64_GPU`.
- `desiredNodeSize`: Optional field, Desired number of nodes to use for the cluster
- `minNodeSize`: Optional field, Minimum number of nodes to use for the cluster
- `maxNodeSize`: Optional field, Maximum number of nodes to use for the cluster
- `blockDeviceSize`: Optional field, Block device size
- `clusterProviderTags`: Optional field, Cluster Provider Tags
- `nodeGroupTags`: Optional field,  Node Group Tags for nodes which run standard cluster software.

### Demonstration - Running GPUs on EKS Cluster

The below usage helps you with a demonstration to use `GpuBuilder` to configure a required setup as you prepare a blueprint for setting up GPU nodes on a new EKS cluster.

```typescript
import * as blueprints from "@aws-quickstart/eks-blueprints";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { GpuBuilder, GpuOptions } from '../common/gpu-builder';

export default class GpuConstruct {
    build(scope: Construct, id: string) {
        const account = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;
        const stackID = `${id}-eks-blueprint`;

        const options: GpuOptions = {
            kubernetesVersion: eks.KubernetesVersion.of("1.28"),
            instanceClass: ec2.InstanceClass.G5,
            instanceSize: ec2.InstanceSize.XLARGE
        };

        const values = {
                    driver: {
                      enabled: true
                    },
                    mig: {
                      strategy: 'mixed'
                    },
                    devicePlugin: {
                      enabled: true,
                      version: 'v0.13.0'
                    },
                    migManager: {
                      enabled: true,
                      WITH_REBOOT: true
                    },
                    toolkit: {
                      version: 'v1.13.1-centos7'
                    },
                    operator: {
                      defaultRuntime: 'containerd'
                    },
                    gfd: {
                      version: 'v0.8.0'
                    }
                }


        GpuBuilder.builder(options)
            .account(account)
            .region(region)
            .enableGpu({values})
            .build(scope, stackID);
    }
}

```

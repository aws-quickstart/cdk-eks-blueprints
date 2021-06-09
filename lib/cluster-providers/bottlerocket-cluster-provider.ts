import { Construct } from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as eks from "@aws-cdk/aws-eks";

import { ClusterInfo, ClusterProvider } from "../stacks/eks-blueprint-stack";

export class BottlerocketClusterProvider implements ClusterProvider {

    createCluster(scope: Construct, vpc: ec2.IVpc, version: eks.KubernetesVersion): ClusterInfo {

        const cluster = new eks.Cluster(scope, scope.node.id, {
            vpc: vpc,
            clusterName: scope.node.id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: version,
        })

        // TODO add support for customizing.
        const nodeGroup = cluster.addAutoScalingGroupCapacity('BottlerocketNodes', {
            instanceType: new ec2.InstanceType('t3.small'),
            minCapacity: 2,
            machineImageType: eks.MachineImageType.BOTTLEROCKET
        });

        return { cluster: cluster, autoscalingGroup: nodeGroup, version }
    }

}
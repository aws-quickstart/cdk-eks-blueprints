import { InstanceType, IVpc, Vpc } from "@aws-cdk/aws-ec2";
import { Cluster, ClusterProps, KubernetesVersion } from "@aws-cdk/aws-eks";
import { Construct } from "@aws-cdk/core";
import { CdkEksBlueprintStack, ClusterInfo, ClusterProvider } from "./eksBlueprintStack";

export class EC2ClusterProvider implements ClusterProvider {
  createCluster(scope: Construct, vpc: IVpc): ClusterInfo {

    // TODO: fix configuration so that it does not always come from context but could be injected
    const instanceType = scope.node.tryGetContext("instanceType") ?? 't3.medium';
    const minClusterSize = scope.node.tryGetContext("minSize") ?? 1;
    const maxClusterSize = scope.node.tryGetContext("maxSize") ?? 3;
    const vpcSubnets = scope.node.tryGetContext("vpcSubnets");

    const id = scope.node.id;

    const cluster = new Cluster(scope, id, {
      vpc: vpc,
      clusterName: id,
      outputClusterName: true,
      defaultCapacity: 0, // we want to manage capacity ourselves
      version: KubernetesVersion.V1_18,
      vpcSubnets: vpcSubnets,
    });

    const nodeGroup = cluster.addNodegroupCapacity(id + "-ng", {
      instanceType: new InstanceType(instanceType),
      minSize: minClusterSize,
      maxSize: maxClusterSize,
    });

    return { cluster: cluster, nodeGroup: nodeGroup };
  }

}
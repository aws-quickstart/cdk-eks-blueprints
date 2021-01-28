import { InstanceType, IVpc, Vpc } from "@aws-cdk/aws-ec2";
import { FargateCluster, ClusterProps, KubernetesVersion, FargateProfileOptions } from "@aws-cdk/aws-eks";
import { Construct } from "@aws-cdk/core";
import { CdkEksBlueprintStack, ClusterInfo, ClusterProvider } from "./eksBlueprintStack";

export class FargateClusterProvider implements ClusterProvider {

  readonly profiles: Map<string, FargateProfileOptions>;

  constructor(inProfiles? : Map<string, FargateProfileOptions>) {
    this.profiles = inProfiles ?? new Map<string, FargateProfileOptions>();
  }

  createCluster(scope: Construct, vpc: IVpc): ClusterInfo {

    // TODO: fix configuration so that it does not always come from context but could be injected
    const vpcSubnets = scope.node.tryGetContext("vpcSubnets");

    const id = scope.node.id;

    const cluster = new FargateCluster(scope, id,  {
      vpc: vpc,
      clusterName: id,
      outputClusterName: true,
      version: KubernetesVersion.V1_18,
      vpcSubnets: vpcSubnets,
      
    });

    for(const [id, options] of this.profiles) {
      cluster.addFargateProfile(id, options);
    }

    return { cluster: cluster};
  }

}
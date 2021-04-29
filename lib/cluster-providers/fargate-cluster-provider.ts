import { Construct } from "@aws-cdk/core";
import { IVpc } from "@aws-cdk/aws-ec2";
import { FargateCluster, KubernetesVersion, FargateProfileOptions, CommonClusterOptions } from "@aws-cdk/aws-eks";

import { ClusterInfo, ClusterProvider } from "../stacks/eks-blueprint-stack";

export class FargateClusterProvider implements ClusterProvider {

    readonly profiles: Map<string, FargateProfileOptions>;

    clusterOptions?: CommonClusterOptions; //TODO: integrate into cluster creation

    constructor(inProfiles?: Map<string, FargateProfileOptions>, clusterOptions?: CommonClusterOptions) {
        this.profiles = inProfiles ?? new Map<string, FargateProfileOptions>();
        this.clusterOptions = clusterOptions;
    }

    createCluster(scope: Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo {

        // TODO: fix configuration so that it does not always come from context but could be injected
        const vpcSubnets = scope.node.tryGetContext("vpcSubnets");

        const id = scope.node.id;

        const cluster = new FargateCluster(scope, id, {
            vpc: vpc,
            clusterName: id,
            outputClusterName: true,
            version: version,
            vpcSubnets: vpcSubnets,

        });

        for (const [id, options] of this.profiles) {
            cluster.addFargateProfile(id, options);
        }

        return { cluster: cluster, version: version };
    }

}
import { Construct } from "@aws-cdk/core";
import { InstanceType, IVpc, SubnetSelection, Vpc } from "@aws-cdk/aws-ec2";
import { Cluster, CommonClusterOptions, KubernetesVersion, NodegroupAmiType } from "@aws-cdk/aws-eks";

import { ClusterInfo, ClusterProvider } from "./eksBlueprintStack";

export interface EC2ProviderClusterProps extends CommonClusterOptions {
    instanceType?: InstanceType; // m5.large

    minSize?: number;

    maxSize?: number;

    amiType?: NodegroupAmiType.AL2_X86_64;

    vpcSubnets?: SubnetSelection[];
}

export class EC2ClusterProvider implements ClusterProvider {

    readonly providerOptions: EC2ProviderClusterProps;

    constructor(options?: EC2ProviderClusterProps) {
        this.providerOptions = options ?? { version: KubernetesVersion.V1_19 };
    }

    createCluster(scope: Construct, vpc: IVpc, version: KubernetesVersion): ClusterInfo {

        const id = scope.node.id;

        const cluster = new Cluster(scope, id, {
            vpc: vpc,
            clusterName: id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: this.providerOptions.version,
            vpcSubnets: this.providerOptions.vpcSubnets,
        });

        const nodeGroup = cluster.addNodegroupCapacity(id + "-ng", {
            instanceType: this.providerOptions.instanceType,
            amiType: this.providerOptions.amiType,
            minSize: this.providerOptions.minSize,
            maxSize: this.providerOptions.maxSize
        });

        return { cluster: cluster, nodeGroup: nodeGroup, version: version };
    }

}
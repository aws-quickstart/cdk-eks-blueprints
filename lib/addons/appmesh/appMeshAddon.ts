import { CdkEksBlueprintStack, ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack";
import { ManagedPolicy } from "@aws-cdk/aws-iam";

export class AppMeshAddon implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;

        const appmeshNs = cluster.addManifest('appmesh-ns', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'appmesh-system' }
        });

        const sa = cluster.addServiceAccount('appmesh-controller', { name: 'appmesh-controller', namespace: "appmesh-system" });
        sa.node.addDependency(appmeshNs);
        sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSCloudMapFullAccess"));
        sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshFullAccess"));


        const chart = cluster.addHelmChart("appmesh-controller", {
            chart: "appmesh-controller",
            repository: "https://aws.github.io/eks-charts",
            release: "appm-release",
            namespace: "appmesh-system",
            values: {
                "region": cluster.stack.region,
                "serviceAccount.create": false,
                "serviceAccount.name": "appmesh-controller"
            }
        });

        chart.node.addDependency(sa);
    }
}
import { ManagedPolicy } from "@aws-cdk/aws-iam";

import { ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack"

export class AppMeshAddon implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {

        const cluster = clusterInfo.cluster;

        // App Mesh service account.
        const opts = { name: 'appmesh-controller', namespace: "appmesh-system" }
        const sa = cluster.addServiceAccount('appmesh-controller', opts);

        // Cloud Map Full Access policy.
        const cloudMapPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSCloudMapFullAccess")
        sa.role.addManagedPolicy(cloudMapPolicy);

        // App Mesh Full Access policy.
        const appMeshPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshFullAccess")
        sa.role.addManagedPolicy(appMeshPolicy);

        // App Mesh Namespace
        const appMeshNS = cluster.addManifest('appmesh-ns', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'appmesh-system' }
        });
        sa.node.addDependency(appMeshNS);

        // App Mesh Controller        
        const chart = cluster.addHelmChart("AppMeshAddon", {
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
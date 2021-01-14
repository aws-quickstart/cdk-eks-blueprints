import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import {ManagedPolicy} from "@aws-cdk/aws-iam";

export class AppMeshAddon implements ClusterAddOn {

    deploy(stack: CdkEksBlueprintStack): void {

        const cluster = stack.cluster;

        const appmeshNs = cluster.addManifest('appmesh-ns', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'appmesh-system' }
        });

        const sa = cluster.addServiceAccount('appmesh-controller', { name: 'appmesh-controller', namespace: "appmesh-system" });
        sa.node.addDependency(appmeshNs);
        sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSCloudMapFullAccess"));
        sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshFullAccess"));


        const chart = stack.cluster.addHelmChart("appmesh-controller", {
            chart: "appmesh-controller",
            release: "appmesh-controller",
            repository: "https://aws.github.io/eks-charts",
            namespace: "appmesh-system", 
            values: {
                "region": stack.region,
                "serviceAccount.create": "false",
                "serviceAccount.name": "appmesh-controller"
            }
        });
        
        chart.node.addDependency(sa);
    }
}
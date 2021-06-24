import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";

export class XrayAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        console.assert(clusterInfo.nodeGroup || clusterInfo.autoscalingGroup, "X-Ray can only be used with EKS EC2 at the moment. "
            + "If using a custom cluster provider, make sure the returned ClusterInfo object has nodeGroup field populated.");

        // Setup managed policy.
        const opts = { name: 'xray-account', namespace: "xray-system" }
        const sa = cluster.addServiceAccount('xray-account', opts);

        // Cloud Map Full Access policy.
        const cloudMapPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess")
        sa.role.addManagedPolicy(cloudMapPolicy);

        // X-Ray Namespace
        const xrayNS = cluster.addManifest('xray-ns', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'xray-system' }
        });
        sa.node.addDependency(xrayNS);

        // Apply manifest
        const doc = readYamlDocument(__dirname + '/xray-ds.yaml');
        const docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, cluster.stack.region)
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "xray-daemon", {
            cluster,
            manifest,
            overwrite: true
        });

        statement.node.addDependency(sa);
    }
}
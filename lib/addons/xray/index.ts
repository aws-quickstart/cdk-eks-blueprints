import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument } from "../../utils";

/**
 * Implementation of AWS X-Ray add-on for EKS Blueprints. Installs xray daemonset and exposes 
 * an internal ClusterIP service for tracing on port 2000 (UDP).
 */
export class XrayAddOn implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        const nodeGroups = assertEC2NodeGroup(clusterInfo, XrayAddOn.name);
        const cloudwatchPolicy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy');
        const xrayPolicy = ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess');

        nodeGroups.forEach(nodeGroup => {
            nodeGroup.role.addManagedPolicy(cloudwatchPolicy);
            nodeGroup.role.addManagedPolicy(xrayPolicy);
        });

        // Apply manifest
        const doc = readYamlDocument(__dirname + '/xray-ds.yaml');
        const docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, cluster.stack.region);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "xray-daemon", {
            cluster,
            manifest,
            overwrite: true
        });
    }
}
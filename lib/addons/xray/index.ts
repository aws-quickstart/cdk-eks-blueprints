import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument, supportsX86 } from "../../utils";

/**
 * Implementation of AWS X-Ray add-on for EKS Blueprints. Installs xray daemonset and exposes 
 * an internal ClusterIP service for tracing on port 2000 (UDP).
 */
@supportsX86
export class XrayAddOn implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        const nodeGroups = assertEC2NodeGroup(clusterInfo, XrayAddOn.name);

        nodeGroups.forEach(nodeGroup => {
            nodeGroup.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));
        });

        // Apply manifest
        const doc = readYamlDocument(__dirname + '/xray-ds.yaml');
        const manifest = doc.split("---").map(e => loadYaml(e));
        new KubernetesManifest(cluster.stack, "xray-daemon", {
            cluster,
            manifest,
            overwrite: true
        });
    }
}
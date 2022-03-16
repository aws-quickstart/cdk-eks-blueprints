import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";

import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument, createNamespace } from "../../utils";

/**
 * Implementation of AWS X-Ray add-on for EKS Blueprints. Installs xray daemonset and exposes 
 * an internal ClusterIP service for tracing on port 2000 (UDP).
 */
export class XrayAddOn implements ClusterAddOn {

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        assertEC2NodeGroup(clusterInfo, "X-Ray Addon");

        // Setup managed policy.
        const opts = { name: 'xray-account', namespace: "xray-system" };
        const sa = cluster.addServiceAccount('xray-account', opts);

        // Cloud Map Full Access policy.
        const cloudMapPolicy = ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess");
        sa.role.addManagedPolicy(cloudMapPolicy);

        // X-Ray Namespace
        const namespace = createNamespace('xray-system', cluster);
        sa.node.addDependency(namespace);

        // Apply manifest
        const doc = readYamlDocument(__dirname + '/xray-ds.yaml');
        const docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, cluster.stack.region);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "xray-daemon", {
            cluster,
            manifest,
            overwrite: true
        });
        statement.node.addDependency(sa);
    }
}
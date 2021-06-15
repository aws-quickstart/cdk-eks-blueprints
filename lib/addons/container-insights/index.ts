import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { ClusterAddOn, ClusterInfo } from "../../stacks/eks-blueprint-stack";
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";

export class ContainerInsightsAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        console.assert(clusterInfo.nodeGroup || clusterInfo.autoscalingGroup, "ContainerInsightsAddon can only be used with EKS EC2 at the moment. "
            + "If using customer cluster provider, make sure you return the node group");

        // Setup managed policy.
        const nodeGroup = clusterInfo.nodeGroup || clusterInfo.autoscalingGroup;
        const policy = ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy')
        nodeGroup!.role.addManagedPolicy(policy)

        // Apply manifest
        const doc = readYamlDocument(__dirname + '/cwagent-fluentd-quickstart.yaml');
        const docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, cluster.stack.region)
        const manifest = docArray.split("---").map(e => loadYaml(e));
        new KubernetesManifest(cluster.stack, "cluster-insights", {
            cluster,
            manifest
        });
    }
}
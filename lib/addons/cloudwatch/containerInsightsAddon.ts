import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class ContainerInsightsAddOn implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
    const cluster = stack.cluster;
    console.assert(stack.nodeGroup, "ContainerInsightsAddon can only be used with EKS EC2 at the moment. "
      + "If using customer cluster provider, make sure you return the node group");
    
    stack.nodeGroup!.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        let doc = readYamlDocument(__dirname + '/cwagent-fluentd-quickstart.yaml');
        let docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, stack.region).split("---").map(e => loadYaml(e));
        new KubernetesManifest(stack, "cluster-insights", {
            cluster,
            manifest: docArray
        });
  }
}
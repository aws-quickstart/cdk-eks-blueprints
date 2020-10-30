import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import { loadYaml, readYamlDocument } from "../../utils/yamlUtils";

export class ContainerInsightsAddOn implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
    const cluster = stack.cluster;
    const ng = stack.nodeGroup;
    ng.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        let doc = readYamlDocument('./lib/addons/cloudwatch/cwagent-fluentd-quickstart.yaml');
        let docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, stack.region).split("---").map(e => loadYaml(e));
        new KubernetesManifest(stack, "cluster-insights", {
            cluster,
            manifest: docArray
        });
  }
}
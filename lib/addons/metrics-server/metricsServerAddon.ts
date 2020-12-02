import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";
import { loadExternalYaml } from "../../utils/yamlUtils";

export class MetricsServerAddon implements ClusterAddOn {

  version: string; 

  constructor(version?: string) {
    this.version = version ?? "v0.4.1";
  }

  deploy(stack: CdkEksBlueprintStack): void {
    const manifestUrl = `https://github.com/kubernetes-sigs/metrics-server/releases/download/${this.version}/components.yaml`;
    const manifest = loadExternalYaml(manifestUrl);
    stack.cluster.addManifest('my-resource', ...manifest);
  }
}
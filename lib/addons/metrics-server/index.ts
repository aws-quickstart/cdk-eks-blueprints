import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";
import { loadExternalYaml } from "../../utils/yaml-utils";

export class MetricsServerAddOn implements ClusterAddOn {

    version: string;

    constructor(version?: string) {
        this.version = version ?? "v0.4.1";
    }

    deploy(clusterInfo: ClusterInfo): void {
        const manifestUrl = `https://github.com/kubernetes-sigs/metrics-server/releases/download/${this.version}/components.yaml`;
        const manifest = loadExternalYaml(manifestUrl);
        clusterInfo.cluster.addManifest('my-resource', ...manifest);
    }
}
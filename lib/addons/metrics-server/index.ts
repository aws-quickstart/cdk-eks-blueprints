import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadExternalYaml } from "../../utils/yaml-utils";

/**
 * Configuration options for the add-on.
 */
export interface MetricsServerAddOnProps {
    /**
     * Metrics Server version
     */
    version?: string
}

/**
 * Defaults options for the add-on
 */
const defaultProps: MetricsServerAddOnProps = {
    version: "v0.5.0"
}

export class MetricsServerAddOn implements ClusterAddOn {

    private props: MetricsServerAddOnProps;

    constructor(props?: MetricsServerAddOnProps) {
        this.props = { ...defaultProps, ...props }
    }

    deploy(clusterInfo: ClusterInfo): void {
        const version = this.props.version
        const manifestUrl = `https://github.com/kubernetes-sigs/metrics-server/releases/download/${version}/components.yaml`;
        const manifest = loadExternalYaml(manifestUrl);
        clusterInfo.cluster.addManifest('my-resource', ...manifest);
    }
}
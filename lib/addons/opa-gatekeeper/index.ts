import { ClusterAddOn, ClusterInfo } from "../../spi";
/**
 * Configuration options for the add-on.
 */
export interface OpaGatekeeperAddOnProps {
    /**
     * Namespace where OPA Gatekeeper will be installed
     * @default kube-system
     */
    namespace?: string;
    /**
     * Helm chart version to use to install.
     * @default 3.6.0
     */
    version?: string;
    /**
     * Values for the Helm chart.
     */
     values?: {
        [key: string]: any;
    };
}
/**
 * Defaults options for the add-on
 */
const defaultProps: OpaGatekeeperAddOnProps = {
    namespace: 'kube-system',
    version: '3.6.0',
    values: {}
};

export class OpaGatekeeperAddOn implements ClusterAddOn {
    
    readonly options: OpaGatekeeperAddOnProps;
    
    constructor(props?: OpaGatekeeperAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        const props = this.options;
        const values = props.values ?? {}
        clusterInfo.cluster.addHelmChart("opagatekeeper-addon", {
            chart: "gatekeeper",
            release: "gatekeeper",
            repository: "https://open-policy-agent.github.io/gatekeeper/charts",
            version: props.version,
            namespace: props.namespace,
            values
        });
    }
}
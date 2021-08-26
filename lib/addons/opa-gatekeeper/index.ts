import { ClusterAddOn, ClusterInfo } from "../../spi"; 

/**
 * Properties available to configure with OPA Gatekeeper. The Helm chart automatically sets the Gatekeeper flag --exempt-namespace={{ .Release.Namespace }} in order to exempt the namespace where the chart is installed, and adds the admission.gatekeeper.sh/ignore label to the namespace during a post-install hook.
 */
 export interface OpaGatekeeperAddOnProps {
    /**
     * Add labels to the namespace during post install hooks
     */
    labelNamespaceEnabled?: string,

    /**
     * Image with kubectl to label the namespace
     */
    labelNamespaceImageRepository?: string,

    /**
     * Image tag
     */
    labelNamespaceImageTag?: string,

     /**
     * Image pullPolicy
     */
    labelNamespacePullPolicy?: string,

    /**
     * Frequency with which audit is run
     */
    auditInterval?: string,

    /**
     * Values to pass to the chart as per https://github.com/open-policy-agent/gatekeeper/blob/master/charts/gatekeeper/README.md
     */
    values?: {
        [key: string]: any;
    };
}

const opagatekeeperAddonDefaults: OpaGatekeeperAddOnProps = {
    labelNamespaceEnabled: 'true',
}

export class OpaGatekeeperAddOn implements ClusterAddOn {

    readonly options?: OpaGatekeeperAddOnProps;

    constructor(props?: OpaGatekeeperAddOnProps) {
        this.options = { ...opagatekeeperAddonDefaults, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {

        clusterInfo.cluster.addHelmChart("opagatekeeper-addon", {
            chart: "gatekeeper",
            release: "gatekeeper",
            repository: "https://open-policy-agent.github.io/gatekeeper/charts",
            version: "3.6.0-beta.3",
            namespace: "kube-system"
        });
    }
}
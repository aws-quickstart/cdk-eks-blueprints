import { ClusterAddOn, ClusterInfo } from "../../spi";
import { setPath } from "../../utils/object-utils";


/**
 * Properties available to configure opa gatekeeper
 */
export interface OpaGatekeeperAddOnProps {
    /**
     * Create namespace for Gatekeeper controller 
     * @default true
     */
    createNamespace?: boolean;

    /** Default namespace
     * @default gatekeeper-system
     */
    namespace?: string;

    /**
     * Helm chart version to use to install.
     * @default 3.7.0-beta.1
     */
    version?: string;

    /**
     * Setting validatingWebhookFailurePolicy to True
     * @default true 
     */
    disableValidatingWebhook?: boolean;

    /**
     * Label namespace so that webhook doesn't interfere with deployment of gatekeeper chart
     * @default true
     */
    labelNamespace?: boolean;

    /**
     * values to pass to the helm chart per https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
     */
     values?: {
        [key: string]: any;
    };
}

/**
 * Defaults options for the add-on
 */
const defaultProps: OpaGatekeeperAddOnProps = {
    namespace: 'gatekeeper-system',
    version: '3.7.0-beta.1',
    disableValidatingWebhook: false,
    labelNamespace: true
};


export class OpaGatekeeperAddOn implements ClusterAddOn {
    
    readonly options: OpaGatekeeperAddOnProps;
    
    constructor(props?: OpaGatekeeperAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }


    deploy(clusterInfo: ClusterInfo): void {

        const props = this.options;

        const values = { ...props.values ?? {}};

        setPath(values, 'disableValidatingWebhook', false)
        setPath(values, 'labelNamespace', true)


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
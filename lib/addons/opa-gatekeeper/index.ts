import { ClusterAddOn, ClusterInfo } from "../../spi";

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
     * 	Whether or not Helm should wait until all Pods, PVCs, Services, and minimum number of Pods of a Deployment, StatefulSet, or ReplicaSet are in a ready state before marking the release as successful.
     * @default true
     */
    wait?: boolean;

    /**
     * Setting validatingWebhookFailurePolicy to True
     * @default true 
     */
    disableValidatingWebhook?: boolean;


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
    wait: true,
    disableValidatingWebhook: true,
    values: {}
};

export class OpaGatekeeperAddOn implements ClusterAddOn {
    
    readonly options: OpaGatekeeperAddOnProps;
    
    constructor(props?: OpaGatekeeperAddOnProps) {
        this.options = { ...defaultProps, ...props };
        //this.options = props ?? defaultProps;
    }

    deploy(clusterInfo: ClusterInfo): void {

        const props = this.options;
       // const values = props.values ?? {}

        clusterInfo.cluster.addHelmChart("opagatekeeper-addon", {
            chart: "gatekeeper",
            release: "gatekeeper",
            repository: "https://open-policy-agent.github.io/gatekeeper/charts",
            version: props.version,
            namespace: props.namespace,
            values: {
                labelNamespace: 'false',
                disableValidatingWebhook: 'true',
                exemptNamespaces: 'kube-system'
            }
        });
    }
}
import { Construct } from "constructs";
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi";
import { setPath } from "../../utils";


/**
 * User provided options for the Helm Chart
 */
export interface KubeviousAddOnProps extends HelmAddOnUserProps {
    /**
     * Version of the helm chart to deploy
     */
    version?: string,
    /**
     * Create an ingress for access to Kubevious
     */
    ingressEnabled?: boolean,
    /**
     * Type of service to expose Kubevious UI
     */
    kubeviousServiceType?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & KubeviousAddOnProps = {
    name: "blueprints-kubevious-addon",
    namespace: "kubevious",
    chart: "kubevious",
    version: "1.1.2",
    release: "kubevious",
    repository:  "https://helm.kubevious.io",
    values: {},

    ingressEnabled: false,
    kubeviousServiceType: "ClusterIP",
};

/**
 * Main class to instantiate the Helm chart
 */
export class KubeviousAddOn extends HelmAddOn {

    readonly options: KubeviousAddOnProps;

    constructor(props?: KubeviousAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as KubeviousAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        let values: Values = populateValues(this.options);
        const chart = this.addHelmChart(clusterInfo, values);

        return Promise.resolve(chart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: KubeviousAddOnProps): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "ingress.enabled",  helmOptions.ingressEnabled);
    setPath(values, "kubevious.service.type",  helmOptions.kubeviousServiceType);
    // Generate a random password for MySQL DB root user
    setPath(values, "mysql.generate_passwords",  true);

    return values;
}

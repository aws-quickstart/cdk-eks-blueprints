import { HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo } from '../../spi/types';
import { HelmAddOn } from '../helm-addon/index';
import { Construct } from "constructs";
import { setPath } from "../../utils";
import { Values } from "../../spi";

/**
 * User provided options for the Helm Chart
 */
export interface FalcoAddOnProps extends HelmAddOnUserProps {
    /**
     * Version of the helm chart to deploy
     */
    version?: string,
    /**
     * Enable Kubernetes meta data collection via a connection to the Kubernetes API server
     */
    kubernetesSupportEnabled?: boolean,
    /**
     * Enable falcosidekick deployment
     */
    falcoSidekickEnabled?: string,
    /**
     * Create namespace for Falco
     * @default falco
     */
    createNamespace?: boolean,
}

/**
 * Default props to be used when creating the Helm chart
 */
 const defaultProps: HelmAddOnProps & FalcoAddOnProps = {
    name: "blueprints-falco-addon",
    namespace: "falco",
    chart: "falco",
    version: "1.18.2",
    release: "falco",
    repository:  "https://falcosecurity.github.io/charts",
    createNamespace: true,
    values: {}
};

export class FalcoAddOn extends HelmAddOn {

    readonly options: FalcoAddOnProps;

    constructor(props?: FalcoAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as FalcoAddOnProps;
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
function populateValues(helmOptions: FalcoAddOnProps): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "kubernetes.support.enabled",  helmOptions.kubernetesSupportEnabled ?? true);
    setPath(values, "falco.sidekick.enabled",  helmOptions.falcoSidekickEnabled ?? true);

    return values;
}

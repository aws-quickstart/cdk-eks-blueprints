import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";

/**
 * Configuration options for the add-on.
 */
type MetricsServerAddOnProps = HelmAddOnUserProps;

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    chart: "metrics-server",
    repository: "https://kubernetes-sigs.github.io/metrics-server",
    version: "3.9.0",
    release: 'blueprints-addon-metrics-server',
    name: 'metrics-server',
    namespace: 'kube-system'
};

export class MetricsServerAddOn extends HelmAddOn {

    private options: MetricsServerAddOnProps;

    constructor(props?: MetricsServerAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): void {
        this.addHelmChart(clusterInfo, this.options.values);
    }
}
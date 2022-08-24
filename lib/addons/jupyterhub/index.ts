import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { createNamespace } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

/**
 * Configuration options for the add-on.
 */
 type JupyterHubAddOnProps = HelmAddOnUserProps;

const JUPYTERHUB = 'jupyterhub';
const RELEASE = 'blueprints-addon-jupyterhub';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: JUPYTERHUB,
    namespace: JUPYTERHUB,
    version: '1.2.0',
    chart: JUPYTERHUB,
    release: RELEASE,
    repository: 'https://jupyterhub.github.io/helm-chart/',
};

/**
 * Implementation of the JupyterHub add-on
 */
export class JupyterHubAddOn extends HelmAddOn {

    readonly options: JupyterHubAddOnProps;

    constructor(props?: JupyterHubAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values = this.options.values ?? {};

        // Create Namespace
        const ns = createNamespace(JUPYTERHUB, cluster, true, true);

        // Create Helm Chart
        const jupyterHubChart = this.addHelmChart(clusterInfo, values, false, true);

        // Add dependency
        jupyterHubChart.node.addDependency(ns);
        return Promise.resolve(jupyterHubChart);
    }
}
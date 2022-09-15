import * as assert from "assert";
import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { createNamespace, dependable, setPath } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

/**
 * Configuration options for the add-on.
 */
export interface JupyterHubAddOnProps extends HelmAddOnUserProps {

    /**
     * Configurations necessary to use EBS as Persistent Volume
     * Defines storageClass for EBS Volume type, and
     * capacity for storage capacity
     */
    ebsConfig: {
        storageClass: string,
        capacity: string,
    }
}

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
    values: {}
};

/**
 * Implementation of the JupyterHub add-on
 */
export class JupyterHubAddOn extends HelmAddOn {

    readonly options: JupyterHubAddOnProps;

    constructor(props?: JupyterHubAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as JupyterHubAddOnProps;
    }

    @dependable('EbsCsiDriverAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values = this.options.values ?? {};
        
        // Create persistent storage with EBS
        const storageClass = this.options.ebsConfig.storageClass || "";
        const capacity = this.options.ebsConfig.capacity || "";
        setPath(values, "singleuser.storage.dynamic.storageClass", storageClass);
        setPath(values, "singleuser.storage.capacity", capacity);

        // Create Namespace
        const ns = createNamespace(this.options.namespace!, cluster, true, true);

        // Create Helm Chart
        const jupyterHubChart = this.addHelmChart(clusterInfo, values, false, true);

        // Add dependency
        jupyterHubChart.node.addDependency(ns);
        return Promise.resolve(jupyterHubChart);
    }
}
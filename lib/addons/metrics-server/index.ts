import { Construct } from 'constructs';
import { merge } from "ts-deepmerge";
import { ClusterInfo, Values } from '../../spi';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { createNamespace, supportsALL } from '../../utils';

/**
 * Configuration options for the add-on.
 */

export interface MetricsServerAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */
    createNamespace?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps & MetricsServerAddOnProps = {
    chart: 'metrics-server',
    repository: 'https://kubernetes-sigs.github.io/metrics-server',
    version: '3.12.2',
    release: 'blueprints-addon-metrics-server',
    name: 'metrics-server',
    namespace: 'kube-system',
    createNamespace: false,
};

@supportsALL
export class MetricsServerAddOn extends HelmAddOn {
    readonly options: MetricsServerAddOnProps;

    constructor(props?: MetricsServerAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props as MetricsServerAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values: Values = this.options ?? {};
        values = merge(values, this.props.values ?? {});
        const chart = this.addHelmChart(clusterInfo, values);

        if (this.options.createNamespace == true) {
            // Let CDK Create the Namespace
            const namespace = createNamespace(this.options.namespace!, cluster);
            chart.node.addDependency(namespace);
        }
        return Promise.resolve(chart);
    }
}

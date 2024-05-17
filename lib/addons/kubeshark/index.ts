import { Construct } from 'constructs';
import { merge } from "ts-deepmerge";
import { ClusterInfo, Values } from '../../spi';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';
import { createNamespace, supportsALL } from '../../utils';

/**
 * Configuration options for the add-on.
 */

export interface KubesharkAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */
    createNamespace?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps & KubesharkAddOnProps = {
    chart: 'kubeshark',
    repository: 'https://helm.kubeshark.co',
    version: '52.3.0',
    release: 'blueprints-addon-kubeshark',
    name: 'kubeshark',
    namespace: 'kube-system',
    createNamespace: false,
};

@supportsALL
export class KubesharkAddOn extends HelmAddOn {
    readonly options: KubesharkAddOnProps;

    constructor(props?: KubesharkAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props as KubesharkAddOnProps;
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

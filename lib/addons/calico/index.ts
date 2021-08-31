import { ClusterAddOn, ClusterInfo } from "../../spi";

/**
 * Configuration options for the add-on.
 */
export interface CalicoAddOnProps {

    /**
     * Namespace where Calico will be installed
     * @default kube-system
     */
    namespace?: string;

    /**
     * Helm chart version to use to install.
     * @default 0.3.4
     */
    chartVersion?: string;

    /**
     * Values for the Helm chart.
     */
    values?: any;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: CalicoAddOnProps = {
    namespace: 'kube-system',
    chartVersion: '0.3.4',
};

export class CalicoAddOn implements ClusterAddOn {

    private options: CalicoAddOnProps;

    constructor(props?: CalicoAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("calico-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            version: this.options.chartVersion,
            namespace: this.options.namespace,
            values: this.options.values
        });
    }
}

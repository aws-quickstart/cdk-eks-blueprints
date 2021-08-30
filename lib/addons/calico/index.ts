import { ClusterAddOn, ClusterInfo } from "../../spi";

/**
 * Configuration options for the add-on.
 */
export interface CalicoAddOnProps {

    /**
     * Namespace where Calico will be installed
     */
    namespace?: string

    /**
     * Helm chart version to use to install.
     */
    chartVersion?: string

    /**
     * Values for the Helm chart.
     */
    values?: any
}

/**
 * Defaults options for the add-on
 */
const defaultProps: CalicoAddOnProps = {
    namespace: 'kube-system',
    chartVersion: '0.3.4',
}

export class CalicoAddOn implements ClusterAddOn {

    private props: CalicoAddOnProps;

    constructor(props?: CalicoAddOnProps) {
        this.props = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        clusterInfo.cluster.addHelmChart("calico-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            version: this.props.chartVersion,
            namespace: this.props.namespace,
            values: this.props.values
        });
    }
}

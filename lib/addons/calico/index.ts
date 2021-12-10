import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";

/**
 * Configuration options for the add-on.
 */
export interface CalicoAddOnProps extends HelmAddOnUserProps {

    /**
     * Namespace where Calico will be installed
     * @default kube-system
     */
    namespace?: string;

    /**
     * Helm chart version to use to install.
     * @default 0.3.10
     */
    version?: string;

    /**
     * Values for the Helm chart.
     */
    values?: any;
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    name: 'calico-addon',
    namespace: 'kube-system',
    version: '0.3.10',
    chart: "aws-calico",
    release: "ssp-addon-calico",
    repository: "https://aws.github.io/eks-charts"
};

export class CalicoAddOn extends HelmAddOn {

    private options: CalicoAddOnProps;

    constructor(props?: CalicoAddOnProps) {
        super({...defaultProps, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): void {
        this.addHelmChart(clusterInfo, this.options.values);
    }
}

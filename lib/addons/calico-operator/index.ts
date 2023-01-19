import merge from "ts-deepmerge";
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";

/**
 * Configuration options for the add-on.
 */
export interface CalicoOperatorAddOnProps extends HelmAddOnUserProps {

    /**
     * Namespace where Calico will be installed
     * @default kube-system
     */
    namespace?: string;

    /**
     * Helm chart version to use to install.
     * @default 3.23.1
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
    name: 'calico-operator',
    namespace: 'calico-operator',
    version: 'v3.24.5',
    chart: "tigera-operator",
    release: "bp-addon-calico-operator",
    repository: "https://projectcalico.docs.tigera.io/charts"
};

export class CalicoOperatorAddOn extends HelmAddOn {

    private options: CalicoOperatorAddOnProps;

    constructor(props?: CalicoOperatorAddOnProps) {
        super({...defaultProps, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): void {
        const values = this.options.values ?? {};
        const defaultValues = {};

        const merged = merge(defaultValues, values);

        this.addHelmChart(clusterInfo, merged);
    }
}

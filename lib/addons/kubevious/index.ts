import { Construct } from '@aws-cdk/core';
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { ClusterInfo, Values } from "../../spi";
import { setPath } from "../../utils";


/**
 * User provided options for the Helm Chart
 */
export interface KubeviousAddOnProps extends HelmAddOnUserProps {
    version?: string,
    ingressEnabled?: boolean,
    kubeviousServiceType?: string,
    mysqlRootPassword?: string,
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & KubeviousAddOnProps = {
    name: "ssp-kubevious-addon",
    namespace: "kubevious",
    chart: "kubevious",
    version: "0.8.15",
    release: "kubevious",
    repository:  "https://helm.kubevious.io",
    values: {},

    ingressEnabled: false,
    kubeviousServiceType: "ClusterIP",
    mysqlRootPassword: "kubevious"
};

/**
 * Main class to instantiate the Helm chart
 */
export class KubeviousAddOn extends HelmAddOn {

    readonly options: KubeviousAddOnProps;

    constructor(props?: KubeviousAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as KubeviousAddOnProps;
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
function populateValues(helmOptions: KubeviousAddOnProps): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "ingress.enabled",  helmOptions.ingressEnabled);
    setPath(values, "kubevious.service.type",  helmOptions.kubeviousServiceType);
    setPath(values, "mysql.root.password",  helmOptions.mysqlRootPassword);

    return values;
}
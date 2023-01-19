import {Construct} from 'constructs';
import {ClusterInfo, Values} from "../../spi";

import {HelmAddOn, HelmAddOnProps, HelmAddOnUserProps} from "../helm-addon";
import {createNamespace, setPath} from "../../utils";


/**
 * Configuration options for add-on.
 */
export interface GmaestroAddOnProps extends HelmAddOnUserProps {
    /**
     * Namespace where add-on will be deployed.
     * @default default
     */
    namespace?: string;

    /**
     * granulate base 64 id.
     */
    b64ClientId: string;

    /**
     * plain text client name.
     */
    clientName: string;

    /**
     * plain text cluster name.
     */
    clusterName: string;

    /**
     * plain text grafana metrics auth key.
     */
    grafanaMetricsAuthKey: string;

    /**
     * plain text grafana logs auth key.
     */
    grafanaLogsAuthKey: string;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: "gmaestro-addon",
    namespace: "default",
    version: '1.0.0-latest',
    chart: "gmaestro",
    release: "gmaestro",
    repository: "https://granulate.github.io/gmaestro-helm"
};


export class GmaestroAddOn extends HelmAddOn {

    readonly options: GmaestroAddOnProps;

    constructor(props?: GmaestroAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as GmaestroAddOnProps;
        if (!this.options.b64ClientId || !this.options.clientName || !this.options.clusterName || !this.options.grafanaMetricsAuthKey || !this.options.grafanaLogsAuthKey) {
            throw new Error(`b64ClientId, clientName, clusterName, grafanaMetricsAuthKey, grafanaLogsAuthKey are Gmaestro addon required fields. 
            Please copy those values form the gmaestro deployment Yaml file (Signup to gmaestro before and generate yaml from the Deploy page).`);
        }
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        let values: Values = populateValues(this.options);
        if (this.options.namespace) {
            const namespace = createNamespace(this.options.namespace!, clusterInfo.cluster, true);
            const chart = this.addHelmChart(clusterInfo, values);
            chart.node.addDependency(namespace);
            return Promise.resolve(chart);
        } else {
            //Namespace is already created
            const chart = this.addHelmChart(clusterInfo, values);
            return Promise.resolve(chart);
        }
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: GmaestroAddOnProps): Values {
    const values = helmOptions.values ?? {};

    setPath(values, "namespace", helmOptions.namespace);
    setPath(values, "b64ClientId", helmOptions.b64ClientId);
    setPath(values, "clientName", helmOptions.clientName);
    setPath(values, "clusterName", helmOptions.clusterName);
    setPath(values, "secrets.grafanaMetricsAuthKey", helmOptions.grafanaMetricsAuthKey);
    setPath(values, "secrets.grafanaLogsAuthKey", helmOptions.grafanaLogsAuthKey);

    return values;
}
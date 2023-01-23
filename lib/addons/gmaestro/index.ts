import {Construct} from 'constructs';
import {ClusterInfo, Values} from "../../spi";

import {HelmAddOn, HelmAddOnProps, HelmAddOnUserProps} from "../helm-addon";
import {createNamespace, getSecretValue, setPath} from "../../utils";


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
     * client id secret name as defined in AWS Secrets Manager (plaintext).
     */
    clientIdSecretName: string;

    /**
     * plain text client name.
     */
    clientName: string;

    /**
     * plain text cluster name.
     */
    clusterName: string;

    /**
     * grafana metrics secret name as defined in AWS Secrets Manager (plaintext).
     * This allows us to store the gmaestro metrics in our grafana account.
     */
    grafanaMetricsSecretName: string;

    /**
     * grafana logs secret name as defined in AWS Secrets Manager (plaintext).
     * This allows us to store the gmaestro logs in our grafana account.
     */
    grafanaLogsSecretName: string;
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
        if (!this.options.clientIdSecretName || !this.options.clientName || !this.options.clusterName || !this.options.grafanaMetricsSecretName || !this.options.grafanaLogsSecretName) {
            throw new Error(`clientIdSecretName, clientName, clusterName, grafanaMetricsSecretName, grafanaLogsSecretName are Gmaestro addon required fields.`);
        }
    }

    async deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        let values: Values = await populateValues(this.options, clusterInfo.cluster.stack.region);
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
 * @param region Region of the stack
 */
async function populateValues(helmOptions: GmaestroAddOnProps, region: string): Promise<Values> {
    const values = helmOptions.values ?? {};

    setPath(values, "namespace", helmOptions.namespace);
    const clientIdSecretValue = await getSecretValue(helmOptions.clientIdSecretName!, region);
    setPath(values, "b64ClientId", clientIdSecretValue);
    setPath(values, "clientName", helmOptions.clientName);
    setPath(values, "clusterName", helmOptions.clusterName);
    const grafanaMetricsSecretValue = await getSecretValue(helmOptions.grafanaMetricsSecretName!, region);
    const grafanaLogsSecretValue = await getSecretValue(helmOptions.grafanaLogsSecretName!, region);
    setPath(values, "secrets.grafanaMetricsAuthKey", grafanaMetricsSecretValue);
    setPath(values, "secrets.grafanaLogsAuthKey", grafanaLogsSecretValue);

    return values;
}
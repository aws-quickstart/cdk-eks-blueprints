import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo } from "../../spi";
import {dependable, loadExternalYaml} from "../../utils";
import { KubectlProvider } from "../helm-addon/kubectl-provider";

/**
 * 
 */
export interface KnativeOperatorProps {
    /**
     * The namespace to install Knative in
     * @default default
     */
    namespace?: string;

    /**
     * The name to be assigned to given to the Knative operator
     * @default knative-operator
     */
    name?: string;

    /**
     * The version of the KNative Operator to use
     * @default v1.8.1
     */
    version?: string;

    /**
     * 
     * @default 'https://github.com/knative/operator/releases/download/knative'
     */
    base_url?: string;
}

const defaultProps = {
    name: 'knative-operator',
    namespace: 'default',
    version: 'v1.8.1',
    base_url: `https://github.com/knative/operator/releases/download/knative`
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeOperator implements ClusterAddOn {

    readonly knativeAddOnProps: KnativeOperatorProps;

    constructor(props?: KnativeOperatorProps) {
        this.knativeAddOnProps = { ...defaultProps, ...props };
    }

    @dependable('IstioControlPlaneAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        // Load External YAML: https://github.com/knative/operator/releases/download/knative-v1.8.1/operator.yaml
        const doc = loadExternalYaml(
            this.knativeAddOnProps.base_url + `-${this.knativeAddOnProps.version}/operator.yaml`
        ).slice(0, 26); // the last element is null

        const kubectlProvider = new KubectlProvider(clusterInfo);

        const statement = kubectlProvider.addManifest(
            { manifest: doc, values: {}, name: 'knative-operator', namespace: 'default' }
        );

        return Promise.resolve(statement);
    }
}

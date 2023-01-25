import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo } from "../../spi";
import {dependable, loadExternalYaml} from "../../utils";
import { HelmAddOnUserProps } from '../helm-addon';
import { KubectlProvider } from "../helm-addon/kubectl-provider";

/**
 * Knative Operator Properties extended 
 */
export interface KnativeOperatorProps extends HelmAddOnUserProps {
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
}

const defaultProps = {
    name: 'knative-operator',
    namespace: 'default',
    version: 'v1.8.1',
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
        const BASE_URL = `https://github.com/knative/operator/releases/download/knative`;

        // Load External YAML: https://github.com/knative/operator/releases/download/knative-v1.8.1/operator.yaml
        const doc = loadExternalYaml(
            BASE_URL + `-${this.knativeAddOnProps.version}/operator.yaml`
        ).slice(0, 26); // the last element is null

        const kubectlProvider = new KubectlProvider(clusterInfo);

        const statement = kubectlProvider.addManifest(
            { manifest: doc, values: {}, name: 'knative-operator', namespace: this.knativeAddOnProps.namespace! }
        );

        return Promise.resolve(statement);
    }
}

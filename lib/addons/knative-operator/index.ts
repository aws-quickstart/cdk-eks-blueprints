import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import {loadYaml, readYamlDocument} from "../../utils";
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

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
}

const defaultProps = {
    name: 'knative-operator',
    namespace: 'default',
    version: 'v1.8',
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeOperator implements ClusterAddOn {

    readonly knativeAddOnProps: KnativeOperatorProps;

    constructor(props?: KnativeOperatorProps) {
        this.knativeAddOnProps = { ...defaultProps, ...props };
    }

    // TODO: Find out why @dependable isn't working
    // @dependable('IstioBaseAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        const doc = readYamlDocument(__dirname + '/knative-operator.yaml');

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            namespace: 'default',
            name: 'knative-operator',
            version: 'v1.8'
        };
        const knativeStatement: ManifestDeployment = {
            name: 'knative-operator',
            namespace: 'default',
            manifest: manifest,
            values: values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(knativeStatement);
        return Promise.resolve(statement);
    }

}

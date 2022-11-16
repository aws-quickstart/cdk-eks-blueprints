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
    namespace: 'default'
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeOperator implements ClusterAddOn {

    readonly knativeAddOnProps: KnativeOperatorProps;

    constructor(props?: KnativeOperatorProps) {
        this.knativeAddOnProps = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {        
        const doc = readYamlDocument(__dirname + '/knative-operator.ytpl');

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            namespace: this.knativeAddOnProps.namespace,
            name: this.knativeAddOnProps.name,
        };

        const manifestDeployment: ManifestDeployment = {
            name: this.knativeAddOnProps.name!,
            namespace: this.knativeAddOnProps.namespace!,
            manifest,
            values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(manifestDeployment);
        
        return Promise.resolve(statement);
    }

}

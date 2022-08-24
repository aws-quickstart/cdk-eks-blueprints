import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadExternalYaml } from "../../utils";
import { KubectlProvider, ManifestConfiguration, ManifestDeployment } from "../helm-addon/kubectl-provider";
import {AmpAddOnProps} from "../amp";

/**
 * This KNative add-on install the KNative Eventing Core
 */

/**
 * Configuration options for add-on
 */
export interface KNativeProps extends ManifestConfiguration {
    /**
     * Version of KNative Eventing Service that will be used by the Cluster
     * @default '1.6.0'
     */
    version?: string;

    /**
     * Name of the Repository download endpoint
     * @default 'knative'
     */
    repository?: string;

    /**
     * Name of the Kubernetes manifest for knative eventing custom resource definitions
     * @default 'eventing-crds.yaml'
     */
    crd_yaml?: string;

    /**
     * Name of the Kubernetes manifest for knative eventing core
     * @default 'eventing-core.yaml'
     */
    core_yaml?: string;
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    name: 'knative-event-engine',
    namespace: 'knative-eventing',
    repository: 'knative',
    crd_yaml: 'eventing-crds.yaml',
    core_yaml: 'eventing-core.yaml',
    version: '1.6.0',
    manifestUrl: 'https://github.com/',
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeAddOn implements ClusterAddOn {
    readonly knativeAddOnProps: KNativeProps;

    constructor(props?: KNativeProps) {
        this.knativeAddOnProps = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        const cluster = clusterInfo.cluster;

        let ;

        const crds_manifest = loadExternalYaml();
    }

}

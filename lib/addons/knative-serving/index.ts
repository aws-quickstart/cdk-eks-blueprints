import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadExternalYaml } from "../../utils";
import { KubectlProvider, ManifestConfiguration, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This KNative add-on install the KNative Eventing Core
 */

/**
 * Configuration options for add-on
 */
export interface KNativeProps extends ManifestConfiguration {
    /**
     *
     */
    extensions?: [SupportedExtensions];

    /**
     *
     */

}

export const enum SupportedExtensions {
    KAFKA_MESSAGING = 'kafka_messaging',
    KAFKA_BROKER = 'kafka_broker',
    KAFKA_SINK = 'kafka_sink'
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
    manifestUrl: 'https://github.com',
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

        const props = this.knativeAddOnProps;

        // https://github.com/knative/eventing/releases/download/knative-v1.6.0/eventing-crds.yaml

        const crds_manifest = loadExternalYaml();
    }

}

export class KNativeMessagingLayer implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        return undefined;
    }
}

export class KNativeBroker implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        return undefined;
    }
}

// TODO: Should we install the eventing extensions as listed here?
// https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/#install-optional-eventing-extensions

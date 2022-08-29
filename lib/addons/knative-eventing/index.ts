import { Construct } from 'constructs';
import { ClusterAddOn, ClusterInfo } from "../../spi";
import {dependable, loadExternalYaml, loadYaml, readYamlDocument} from "../../utils";
import { KubectlProvider, ManifestConfiguration, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This KNative add-on install the KNative Eventing Core
 */

/**
 * Configuration options for add-on
 */
export interface KNativeEventingProps extends ManifestConfiguration {
    /**
     *
     */
    extensions?: [SupportedExtensions];

    /**
     * Repository URL of the CRD Manifest
     * @default 'https://github.com/knative/eventing/releases/download/knative-v${version}/eventing-crds.yaml'
     */
    crd_manifest?: string;

    /**
     * Repository URL of the Core Manifest
     * @default 'https://github.com/knative/eventing/releases/download/knative-v${version}/eventing-core.yaml'
     */
    core_manifest?: string;
}

/**
 * Enumerated extensions that we support :)
 */
export const enum SupportedExtensions {
    KAFKA_MESSAGING = 'kafka_messaging',
    KAFKA_BROKER = 'kafka_broker',
    KAFKA_SINK = 'kafka_sink'
}

/**
 * Defaults options for the add-on
 */
const defaultProps: KNativeEventingProps = {
    name: 'knative-event-engine',
    namespace: 'knative-eventing',
    // crd_manifest: 'https://github.com/knative/eventing/releases/download/knative-v1.6.0/eventing-crds.yaml',
    // core_manifest: 'https://github.com/knative/eventing/releases/download/knative-v1.6.0/eventing-core.yaml',
    manifestUrl: 'https://github.com/knative/eventing',
};

/**
 * Implementation of KNative add-on for EKS Blueprints. Installs KNative to the Cluster.
 */
export class KNativeEventingAddOn implements ClusterAddOn {
    readonly knativeEventingAddOnProps: KNativeEventingProps;

    constructor(props?: KNativeEventingProps) {
        this.knativeEventingAddOnProps = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        const props = this.knativeEventingAddOnProps;

        // https://github.com/knative/eventing/releases/download/knative-v1.6.0/eventing-crds.yaml
        // const crds_doc = readYamlDocument(__dirname + '/eventing-crds.yaml');
        // const core_doc = readYamlDocument(__dirname + '/eventing-core.yaml');
        //
        // const crds_manifest = crds_doc.split("---").map(e => loadYaml(e));
        // const core_manifest = core_doc.split("---").map(e => loadYaml(e));
        const crds_manifest = loadExternalYaml(__dirname + '/eventing-crds.yaml');
        const core_manifest = loadExternalYaml(__dirname + '/eventing-core.yaml');

        const crds_deployment: ManifestDeployment = {
            name: this.knativeEventingAddOnProps.name!,
            namespace: this.knativeEventingAddOnProps.namespace!,
            manifest: crds_manifest,
            values: {},
        };

        const core_deployment: ManifestDeployment = {
            name: this.knativeEventingAddOnProps.name!,
            namespace: this.knativeEventingAddOnProps.namespace!,
            manifest: core_manifest,
            values: {}
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const crds_statement = kubectlProvider.addManifest(crds_deployment);
        const core_statement = kubectlProvider.addManifest(core_deployment);

        return Promise.resolve(core_statement);
    }

}

export class KNativeKafkaMessaging implements ClusterAddOn {
    @dependable('KNativeEventingAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        return undefined;
    }
}

export class KNativeKafkaBroker implements ClusterAddOn {
    @dependable('KNativeEventingAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        return undefined;
    }
}

export class KNativeKafkaSink implements ClusterAddOn {
    @dependable('KNativeEventingAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void {
        return undefined;
    }
}

// TODO: Should we install the eventing extensions as listed here?
// https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/#install-optional-eventing-extensions

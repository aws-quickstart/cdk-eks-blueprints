import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This AMP add-on installs an ADOT Collector for Amazon Managed Service for Prometheus 
 * (AMP) and creates an AMP worpsace to receive OTLP metrics from the application and 
 * Prometheus metrics scraped from pods on the cluster and remote writes the metrics 
 * to AMP remote write endpoint of the created or passed AMP workspace.
 */

/**
 * Configuration options for add-on.
 */
export interface AmpAddOnProps {
    /** 
     * Remote Write URL of the AMP Workspace to be used for setting up remote write.
     *  Format : https://aps-workspaces.<region>.amazonaws.com/workspaces/<ws-workspaceid>/",
     */
    ampPrometheusEndpoint: string;
    /**
     * Modes supported : `deployment`, `daemonset`, `statefulSet`, and `sidecar`
     * @default deployment
     */
    deploymentMode?: DeploymentMode;
    /**
     * Namespace to deploy the ADOT Collector for AMP.
     * @default default
     */
    namespace?: string;
    /**
     * Name for deployment of the ADOT Collector for AMP.
     * @default 'adot-collector-amp'
     */
     name?: string;
     /**
     * An alternative OpenTelemetryCollector if you need further cusomisation.
     * If not provided, the default will be used.
     */
     openTelemetryCollectorManifestPath?: string;
     /**
     * This parameter can be provided in case an alternative OpenTelemetryCollector is set via the openTelemetryCollectorManifestPath parameter.
     * It holds an object of type Values, with keys and values. The same key literals will need to be used within the manifest between double curly braces {{}} and the add-on will replace them with the related values.
     * The following keys are already in use by the add-on and will be replaced in your manifest with configured values, if you want to use them:
     * remoteWriteEndpoint, awsRegion, deploymentMode, namespace, clusterName. To use any of those you can just include e.g. {{remoteWriteEndpoint}} inside the manifest.
     */
     openTelemetryCollectorManifestParameterMap?: Values;
}

export const enum DeploymentMode {
    DEPLOYMENT = 'deployment',
    DAEMONSET = 'daemonset',
    STATEFULSET = 'statefulset',
    SIDECAR = 'sidecar'
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    deploymentMode: DeploymentMode.DEPLOYMENT,
    name: 'adot-collector-amp',
    namespace: 'default'
};

/**
 * Implementation of AMP add-on for EKS Blueprints. Installs ADOT Collector.
 */
export class AmpAddOn implements ClusterAddOn {

    readonly ampAddOnProps: AmpAddOnProps;

    constructor(props: AmpAddOnProps) {
        this.ampAddOnProps = { ...defaultProps, ...props };
    }

    @dependable(AdotCollectorAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let doc: string;

        // Applying manifest for configuring ADOT Collector for Amp.
        if (this.ampAddOnProps.deploymentMode == DeploymentMode.DAEMONSET) {
            doc = readYamlDocument(__dirname +'/collector-config-amp-daemonset.ytpl');
        }
        else {
            doc = readYamlDocument(__dirname + '/collector-config-amp.ytpl');
        }

        const manifest = doc.split("---").map(e => {
            let object = loadYaml(e);

            if (this.ampAddOnProps.openTelemetryCollectorManifestPath !== undefined && object.kind === "OpenTelemetryCollector"){
                object = readYamlDocument(this.ampAddOnProps.openTelemetryCollectorManifestPath!);
                object = loadYaml(object);
            }
            return object;
        });
        const attrPrometheusEndpoint = this.ampAddOnProps.ampPrometheusEndpoint + 'api/v1/remote_write';
        const values: Values = {
            remoteWriteEndpoint: attrPrometheusEndpoint,
            awsRegion: cluster.stack.region,
            deploymentMode: this.ampAddOnProps.deploymentMode,
            namespace: this.ampAddOnProps.namespace,
            clusterName: cluster.clusterName,
            ...this.ampAddOnProps.openTelemetryCollectorManifestParameterMap
         };
         
         const manifestDeployment: ManifestDeployment = {
            name: this.ampAddOnProps.name!,
            namespace: this.ampAddOnProps.namespace!,
            manifest,
            values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(manifestDeployment);

        return Promise.resolve(statement);
    }
}

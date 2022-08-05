import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This XRAY ADOT add-on deploys an AWS Distro for OpenTelemetry (ADOT) Collector for X-Ray which receives traces from the 
 * application and sends the same to X-Ray console. You can change the mode to Daemonset, StatefulSet, 
 * and Sidecar depending on your deployment strategy.
 */

/**
 * Configuration options for add-on.
 */
export interface XrayAdotAddOnProps {
    /**
     * Modes supported : `deployment`, `daemonset`, `statefulSet`, and `sidecar`
     * @default deployment
     */
    deploymentMode?: xrayDeploymentMode;
    /**
     * Namespace to deploy the ADOT Collector for XRay.
     * @default default
     */
    namespace?: string;
    /**
     * Name for deployment of the ADOT Collector for XRay.
     * @default 'adot-collector-xray'
     */
    name?: string;
}

export const enum xrayDeploymentMode {
    DEPLOYMENT = 'deployment',
    DAEMONSET = 'daemonset',
    STATEFULSET = 'statefulset',
    SIDECAR = 'sidecar'
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    deploymentMode: xrayDeploymentMode.DEPLOYMENT,
    name: 'adot-collector-xray',
    namespace: 'default'
};

/**
 * Implementation of XRAY ADOT add-on for EKS Blueprints. Installs ADOT Collector.
 */
export class XrayAdotAddOn implements ClusterAddOn {

    readonly xrayAddOnProps: XrayAdotAddOnProps;
    constructor(props?: XrayAdotAddOnProps) {
        this.xrayAddOnProps = { ...defaultProps, ...props };
    }

    @dependable(AdotCollectorAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let doc: string;

        // Applying manifest for configuring ADOT Collector for Xray.
        doc = readYamlDocument(__dirname +'/collector-config-xray.ytpl');

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            awsRegion: cluster.stack.region,
            deploymentMode: this.xrayAddOnProps.deploymentMode,
            namespace: this.xrayAddOnProps.namespace
         };
         
         const manifestDeployment: ManifestDeployment = {
            name: this.xrayAddOnProps.name!,
            namespace: this.xrayAddOnProps.namespace!,
            manifest,
            values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(manifestDeployment);
        return Promise.resolve(statement);
    }
}
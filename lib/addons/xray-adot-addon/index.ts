import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This XRAY ADOT Addon deploys an AWS Distro for OpenTelemetry (ADOT) Collector for X-Ray which receives traces from the 
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
    namepace?: string;
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
        let awsRegion: string;
        let deploymentMode: string;
        let name: string;
        let namespace: string;
        let doc: string;

        deploymentMode = defaultProps.deploymentMode;
        if (this.xrayAddOnProps.deploymentMode) {
            deploymentMode = this.xrayAddOnProps.deploymentMode;
        }

        name = defaultProps.name;
        namespace = defaultProps.namespace;
        awsRegion = cluster.stack.region;
        if (this.xrayAddOnProps.namepace) {
            namespace = this.xrayAddOnProps.namepace;
        }

        // Applying manifest for configuring ADOT Collector for Xray.
        doc = readYamlDocument(__dirname +'/collector-config-xray.ytpl');

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            awsRegion,
            deploymentMode,
            namespace
         };
         
         const manifestDeployment: ManifestDeployment = {
            name,
            namespace,
            manifest,
            values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(manifestDeployment);
        return Promise.resolve(statement);
    }
}
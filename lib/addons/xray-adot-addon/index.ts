import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';

/**
 * Configuration options for add-on.
 */
 export interface XrayAdotAddOnProps {
    /**
     * Modes supported : `deployment`, `daemonset`, `statefulSet`, and `sidecar`
     * @default deployment
     */
    deploymentMode?: XrayDeploymentMode;
    /**
     * Namespace to deploy the ADOT Collector for XRay.
     * @default default
     */
    namepace?: string;
}

export const enum XrayDeploymentMode {
    DEPLOYMENT = 'deployment',
    DAEMONSET = 'daemonset',
    STATEFULSET = 'statefulset',
    SIDECAR = 'sidecar'
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    deploymentMode: XrayDeploymentMode.DEPLOYMENT,
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
        let finalDeploymentMode: string;
        let finalNamespace: string;
        let doc: string;
        
        finalDeploymentMode = defaultProps.deploymentMode;
        if (this.xrayAddOnProps.deploymentMode) {
            finalDeploymentMode = this.xrayAddOnProps.deploymentMode;
        }

        finalNamespace = defaultProps.namespace;
        if (this.xrayAddOnProps.namepace) {
            finalNamespace = this.xrayAddOnProps.namepace;
        }

        // Applying manifest for configuring ADOT Collector for Xray.
        doc = readYamlDocument(__dirname + '/collector-config-xray.ytpl');
        const docArray = doc.replace(/{{your_aws_region}}/g, cluster.stack.region)
        .replace(/{{your_deployment_method}}/g, finalDeploymentMode)
        .replace(/{{your_namespace}}/g, finalNamespace);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "adot-collector-xray", {
            cluster,
            manifest,
            overwrite: true
        });
        return Promise.resolve(statement);
    }
}
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { KubectlProvider, ManifestDeployment } from "../helm-addon/kubectl-provider";

/**
 * This CloudWatch ADOT Addon deploys an AWS Distro for OpenTelemetry (ADOT) Collector for 
 * CloudWatch which receives metrics and logs from the application and sends the same to 
 * CloudWatch console. You can change the mode to Daemonset, StatefulSet, and Sidecar 
 * depending on your deployment strategy.
 */

/**
 * Configuration options for add-on.
 */
export interface CloudWatchAdotAddOnProps {
    /**
     * Modes supported : `deployment`, `daemonset`, `statefulSet`, and `sidecar`
     * @default deployment
     */
    deploymentMode?: cloudWatchDeploymentMode;
    /**
     * Namespace to deploy the ADOT Collector for CloudWatch.
     * @default default
     */
    namepace?: string;
}

export const enum cloudWatchDeploymentMode {
    DEPLOYMENT = 'deployment',
    DAEMONSET = 'daemonset',
    STATEFULSET = 'statefulset',
    SIDECAR = 'sidecar'
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    deploymentMode: cloudWatchDeploymentMode.DEPLOYMENT,
    namespace: 'default'
};

/**
 * Implementation of CloudWatch ADOT add-on for EKS Blueprints. Installs ADOT Collector.
 */
export class CloudWatchAdotAddOn implements ClusterAddOn {

    readonly cloudWatchAddOnProps: CloudWatchAdotAddOnProps;

    constructor(props?: CloudWatchAdotAddOnProps) {
        this.cloudWatchAddOnProps = { ...defaultProps, ...props };
    }

    @dependable(AdotCollectorAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let awsRegion: string;
        let deploymentMode: string;
        let name: string;
        let namespace: string;
        let clusterName: string;
        let doc: string;

        deploymentMode = defaultProps.deploymentMode;
        if (this.cloudWatchAddOnProps.deploymentMode) {
            deploymentMode = this.cloudWatchAddOnProps.deploymentMode;
        }

        name = defaultProps.namespace;
        namespace = defaultProps.namespace;
        awsRegion = cluster.stack.region;
        clusterName = cluster.clusterName;
        if (this.cloudWatchAddOnProps.namepace) {
            namespace = this.cloudWatchAddOnProps.namepace;
        }

        // Applying manifest for configuring ADOT Collector for CloudWatch.
        doc = readYamlDocument(__dirname +'/collector-config-cloudwatch.ytpl');

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            awsRegion,
            deploymentMode,
            namespace,
            clusterName
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
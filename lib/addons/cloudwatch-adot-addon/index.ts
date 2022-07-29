import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';

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
        let finalDeploymentMode: string;
        let finalNamespace: string;
        let doc: string;
        
        finalDeploymentMode = defaultProps.deploymentMode;
        if (this.cloudWatchAddOnProps.deploymentMode) {
            finalDeploymentMode = this.cloudWatchAddOnProps.deploymentMode;
        }

        finalNamespace = defaultProps.namespace;
        if (this.cloudWatchAddOnProps.namepace) {
            finalNamespace = this.cloudWatchAddOnProps.namepace;
        }

        // Applying manifest for configuring ADOT Collector for CloudWatch.
        doc = readYamlDocument(__dirname + '/collector-config-cloudwatch.ytpl');
        const docArray = doc.replace(/{{your_aws_region}}/g, cluster.stack.region)
        .replace(/{{your_deployment_method}}/g, finalDeploymentMode)
        .replace(/{{your_namespace}}/g, finalNamespace)
        .replace(/{{your_cluster_name}}/g, clusterInfo.cluster.clusterName);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "adot-collector-cloudwatch", {
            cluster,
            manifest,
            overwrite: true
        });
        return Promise.resolve(statement);
    }
}
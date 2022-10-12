import * as aps from 'aws-cdk-lib/aws-aps';
import { CfnWorkspaceProps } from 'aws-cdk-lib/aws-aps';
import { ClusterAddOn, ClusterInfo, Values } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { CfnTag } from "aws-cdk-lib/core";
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
     * Name that will be used by the add-on to create the Workspace
     * @default blueprints-amp-workspace
     */
    workspaceName?: string;
    /** 
     * Remote Write URL of the AMP Workspace to be used for setting up remote write.
     */
     prometheusRemoteWriteURL?: string;
    /**
     * Tags to passed while creating AMP workspace
     * @default Project
     */
     workspaceTags?: CfnTag[];
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
    workspaceName: 'blueprints-amp-workspace',
    deploymentMode: DeploymentMode.DEPLOYMENT,
    name: 'adot-collector-amp',
    namespace: 'default'
};

/**
 * Implementation of AMP add-on for EKS Blueprints. Installs ADOT Collector.
 */
export class AmpAddOn implements ClusterAddOn {

    readonly ampAddOnProps: AmpAddOnProps;

    constructor(props?: AmpAddOnProps) {
        this.ampAddOnProps = { ...defaultProps, ...props };
    }

    @dependable(AdotCollectorAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let doc: string;
        let cfnWorkspace: aps.CfnWorkspace|undefined;
        
        let cfnWorkspaceProps : CfnWorkspaceProps  = {
            alias: this.ampAddOnProps.workspaceName,  
            tags: this.ampAddOnProps.workspaceTags
        };

        if (typeof(this.ampAddOnProps.prometheusRemoteWriteURL) == 'undefined' || this.ampAddOnProps.prometheusRemoteWriteURL == null ) {
            cfnWorkspace = new aps.CfnWorkspace(cluster.stack, this.ampAddOnProps.workspaceName + "-amp-workspace", cfnWorkspaceProps);/* all optional props */ 
            const ampUrlEndpoint = cfnWorkspace.attrPrometheusEndpoint;
            this.ampAddOnProps.prometheusRemoteWriteURL = ampUrlEndpoint + 'api/v1/remote_write';
        }

        // Applying manifest for configuring ADOT Collector for Amp.
        if (this.ampAddOnProps.deploymentMode == DeploymentMode.DAEMONSET) {
            doc = readYamlDocument(__dirname +'/collector-config-amp-daemonset.ytpl');
        }
        else {
            doc = readYamlDocument(__dirname + '/collector-config-amp.ytpl');
        }

        const manifest = doc.split("---").map(e => loadYaml(e));
        const values: Values = {
            remoteWriteEndpoint: this.ampAddOnProps.prometheusRemoteWriteURL,
            awsRegion: cluster.stack.region,
            deploymentMode: this.ampAddOnProps.deploymentMode,
            namespace: this.ampAddOnProps.namespace,
            clusterName: cluster.clusterName
         };
         
         const manifestDeployment: ManifestDeployment = {
            name: this.ampAddOnProps.name!,
            namespace: this.ampAddOnProps.namespace!,
            manifest,
            values
        };

        const kubectlProvider = new KubectlProvider(clusterInfo);
        const statement = kubectlProvider.addManifest(manifestDeployment);
        if (cfnWorkspace){
            statement.node.addDependency(cfnWorkspace);
        }

        return Promise.resolve(statement);
    }
}

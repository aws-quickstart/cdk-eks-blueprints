import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import * as aps from 'aws-cdk-lib/aws-aps';
import { CfnWorkspaceProps } from 'aws-cdk-lib/aws-aps';
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';
import { CfnTag } from "aws-cdk-lib/core";

/**
 * This AMP Addon installs an ADOT Collector for Amazon Managed Service for Prometheus 
 * (AMP) and creates an AMP worpsace to receive OTLP metrics from the application and 
 * Prometheus metrics scraped from pods on the cluster and remote writes the metrics 
 * to AMP remote write endpoint of the created or passed AMP workspace.
 */

/**
 * Configuration options for the Amp add-on.
 */
 export interface AmpAddOnProps {
    /**
     * Name that will be used by the Addon to create the Workspace
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
     namepace?: string;
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
    workspaceTags: [{
        key: 'Name',
        value: 'blueprints-amp-workspace',
      },
      {
        key: 'Environment',
        value: 'blueprints-sandbox',
      }
    ],
    deploymentMode: DeploymentMode.DEPLOYMENT,
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
        let finalRemoteWriteURLEndpoint: string;
        let finalDeploymentMode: string;
        let finalNamespace: string;
        let doc: string;
        let cfnWorkspace: aps.CfnWorkspace|undefined;
        
        let cfnWorkspaceProps : CfnWorkspaceProps  = {
            alias: defaultProps.workspaceName,  
            tags: defaultProps.workspaceTags
        };
        if (this.ampAddOnProps.prometheusRemoteWriteURL) {
            finalRemoteWriteURLEndpoint = this.ampAddOnProps.prometheusRemoteWriteURL;
        }
        else {
            if (this.ampAddOnProps.workspaceName){
                cfnWorkspaceProps = {
                    ...cfnWorkspaceProps,
                    alias:this.ampAddOnProps.workspaceName
                };        
            }
    
            if (this.ampAddOnProps.workspaceTags){
                cfnWorkspaceProps = {
                    ...cfnWorkspaceProps,
                    tags:this.ampAddOnProps.workspaceTags
                }; 
            }
            cfnWorkspace = new aps.CfnWorkspace(cluster.stack, 'MyAMPWorkspace', cfnWorkspaceProps);/* all optional props */ 
            const URLEndpoint = cfnWorkspace.attrPrometheusEndpoint;
            finalRemoteWriteURLEndpoint = URLEndpoint + 'api/v1/remote_write';
        }

        finalDeploymentMode = defaultProps.deploymentMode;
        if (this.ampAddOnProps.deploymentMode) {
            finalDeploymentMode = this.ampAddOnProps.deploymentMode;
        }

        finalNamespace = defaultProps.namespace;
        if (this.ampAddOnProps.namepace) {
            finalNamespace = this.ampAddOnProps.namepace;
        }

        // Applying manifest for configuring ADOT Collector for Amp.
        if (finalDeploymentMode == DeploymentMode.DAEMONSET) {
            doc = readYamlDocument(__dirname + '/collector-config-amp-daemonset.ytpl');
        }
        else {
            doc = readYamlDocument(__dirname + '/collector-config-amp.ytpl');
        }
        const docArray = doc.replace(/{{your_remote_write_endpoint}}/g, finalRemoteWriteURLEndpoint)
        .replace(/{{your_aws_region}}/g, cluster.stack.region)
        .replace(/{{your_deployment_method}}/g, finalDeploymentMode)
        .replace(/{{your_namespace}}/g, finalNamespace);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "adot-collector-amp", {
            cluster,
            manifest,
            overwrite: true
        });
        if (cfnWorkspace){
            statement.node.addDependency(cfnWorkspace);
        }
        return Promise.resolve(statement);
    }
}
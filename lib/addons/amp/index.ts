import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import * as aps from 'aws-cdk-lib/aws-aps';
import { CfnWorkspaceProps } from 'aws-cdk-lib/aws-aps';
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { dependable, loadYaml, readYamlDocument } from "../../utils";
import { AdotCollectorAddOn } from "../adot";
import { Construct } from 'constructs';

/**
 * Configuration options for add-on.
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
     * Tag Key to passed while creating AMP workspace
     * @default Project
     */
     workspaceTagKey?: string;
    /**
     * Tag Value to passed while creating AMP workspace
     * @default blueprints-amp-workspace
     */
     workspaceTagValue?: string;
    /**
     * Modes supported : `deployment`, `daemonset`, `statefulSet`, and `sidecar`
     * @default deployment
     */
     deploymentMode?: DeploymentMode;
}

export const enum DeploymentMode {
    DEPLOYMENT = 'deployment',
    DAEMONSET = 'daemonset',
    STATEFULSET = 'statefulSet',
    SIDECAR = 'sidecar'
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    workspaceName: 'blueprints-amp-workspace',
    workspaceTagKey: 'Project',
    workspaceTagValue: 'blueprints-amp-workspace',
    deploymentMode: DeploymentMode.DEPLOYMENT
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
        let doc: string;
        
        let cfnWorkspaceProps : CfnWorkspaceProps  = {
            alias: defaultProps.workspaceName,  
            tags: [{
            key: defaultProps.workspaceTagKey,
            value: defaultProps.workspaceTagValue
            }],
        }

        if (this.ampAddOnProps.workspaceName){
            cfnWorkspaceProps = {
                ...cfnWorkspaceProps,
                alias:this.ampAddOnProps.workspaceName
            };        
        }

        if (this.ampAddOnProps.workspaceTagKey && this.ampAddOnProps.workspaceTagValue){
            cfnWorkspaceProps = {
                ...cfnWorkspaceProps,
                tags: [{
                    key: this.ampAddOnProps.workspaceTagKey,
                    value: this.ampAddOnProps.workspaceTagValue
                }]
            }
        }

        if (this.ampAddOnProps.prometheusRemoteWriteURL) {
            finalRemoteWriteURLEndpoint = this.ampAddOnProps.prometheusRemoteWriteURL;
        }
        else {
            const cfnWorkspace = new aps.CfnWorkspace(cluster.stack, 'MyAMPWorkspace', cfnWorkspaceProps);/* all optional props */ 
            const URLEndpoint = cfnWorkspace.attrPrometheusEndpoint;
            finalRemoteWriteURLEndpoint = URLEndpoint + 'api/v1/remote_write';
        }

        finalDeploymentMode = defaultProps.deploymentMode
        if (this.ampAddOnProps.deploymentMode) {
            finalDeploymentMode = this.ampAddOnProps.deploymentMode
        }

        // Applying manifest for configuring ADOT Collector for Amp.
        console.log("Deployment Mode => " +finalDeploymentMode)
        if (finalDeploymentMode == DeploymentMode.DAEMONSET) {
            doc = readYamlDocument(__dirname + '/collector-config-amp-daemonset.yaml');
        }
        else {
            doc = readYamlDocument(__dirname + '/collector-config-amp.yaml');
        }
        const docArray = doc.replace(/{{YOUR_REMOTE_WRITE_ENDPOINT}}/g, finalRemoteWriteURLEndpoint)
        .replace(/{{YOUR_AWS_REGION}}/g, cluster.stack.region)
        .replace(/{{YOUR_DEPLOYMENT_METHOD}}/g, finalDeploymentMode);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "adot-collector-amp", {
            cluster,
            manifest,
            overwrite: true
        });
        return Promise.resolve(statement);
    }
}
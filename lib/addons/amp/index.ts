import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import * as aps from 'aws-cdk-lib/aws-aps';

import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument } from "../../utils";


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
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    workspaceName: 'blueprints-amp-workspace',
    workspaceTagKey: 'Project',
    workspaceTagValue: 'blueprints-amp-workspace'
};

/**
 * Implementation of AMP add-on for EKS Blueprints. Installs ADOT Collector.
 */
export class AmpAddOn implements ClusterAddOn {

    readonly ampAddOnProps: AmpAddOnProps;

    constructor(props?: AmpAddOnProps) {
        this.ampAddOnProps = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        let finalRemoteWriteURLEndpoint: string;
        let finalWorkspaceName: string | undefined = undefined;
        let finalWorkspaceTagKey: string | undefined = undefined;
        let finalWorkspaceTagValue: string | undefined = undefined;
        
        finalWorkspaceName = defaultProps.workspaceName
        if (this.ampAddOnProps.workspaceName){
            finalWorkspaceName = this.ampAddOnProps.workspaceName
        }

        finalWorkspaceTagKey = defaultProps.workspaceTagKey
        if (this.ampAddOnProps.workspaceTagKey){
            finalWorkspaceTagKey = this.ampAddOnProps.workspaceTagKey
        }

        finalWorkspaceTagValue = defaultProps.workspaceTagValue
        if (this.ampAddOnProps.workspaceTagValue){
            finalWorkspaceTagValue = this.ampAddOnProps.workspaceTagValue
        }

        if (this.ampAddOnProps.prometheusRemoteWriteURL) {
            finalRemoteWriteURLEndpoint = this.ampAddOnProps.prometheusRemoteWriteURL;
        }
        else {
            const cfnWorkspace = new aps.CfnWorkspace(cluster.stack, 'MyAMPWorkspace', /* all optional props */ {
                alias: finalWorkspaceName,
                tags: [{
                key: finalWorkspaceTagKey,
                value: finalWorkspaceTagValue
                }],
            });
            const URLEndpoint = cfnWorkspace.attrPrometheusEndpoint;
            finalRemoteWriteURLEndpoint = URLEndpoint + 'api/v1/remote_write';
        }

        // Applying manifest for configuring ADOT Collector for Amp.
        const doc = readYamlDocument(__dirname + '/collector-config-amp.yaml');
        const docArray = doc.replace(/{{YOUR_REMOTE_WRITE_ENDPOINT}}/g, finalRemoteWriteURLEndpoint).replace(/{{YOUR_AWS_REGION}}/g, cluster.stack.region);
        const manifest = docArray.split("---").map(e => loadYaml(e));
        const statement = new KubernetesManifest(cluster.stack, "adot-collector-amp", {
            cluster,
            manifest,
            overwrite: true
        });
    }
}
import * as spi from '../spi';
import * as aps from 'aws-cdk-lib/aws-aps';
import { CfnTag } from "aws-cdk-lib/core";

/**
 * Returns the received remote write url for AMP
 */
export class ImportAmpProvider extends ResourceProvider<aps.CfnWorkspace>{

    constructor(private readonly remoteWriteEndpoint: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : string {
        return this.remoteWriteEndpoint;
    }
}

/**
 * Creates new AMP Workspace with provided AMP Workspace name 
 */
export class CreateAmpProvider extends ResourceProvider<aps.CfnWorkspace> {

    /**
     * Creates the AMP workspace
     * @param name Name of this resource that other resource providers, add-ons and teams can use for look-up.
     * @param workspaceName Name of your AMP Workspace
     * @param workspaceTags Tags to be used to create AMP Workspace
     */
    constructor(readonly name: string, readonly workspaceName: string, readonly workspaceTags?: CfnTag[]) {}

    provide(context: spi.ResourceContext) : string {
        let cfnWorkspace: aps.CfnWorkspace|undefined;
        cfnWorkspace = new aps.CfnWorkspace(context.scope, this.name, {
            alias: this.workspaceName,  
            tags: this.workspaceTags,
          }); 
        return cfnWorkspace.attrPrometheusEndpoint + 'api/v1/remote_write';     
    }
}
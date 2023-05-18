import * as spi from '../spi';
import * as aps from 'aws-cdk-lib/aws-aps';
import { CfnTag } from "aws-cdk-lib/core";

/**
 * Certificate provider that imports certificate into the current stack by arn. 
 */
export class ImportAmpProvider extends ResourceProvider<aps.CfnWorkspace>{

    constructor(private readonly remoteWriteEndpoint: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : string {
        return this.remoteWriteEndpoint;
    }
}

/**
 * Certificate provider that creates a new certificate. 
 * Expects a hosted zone to be registed for validation. 
 */
export class CreateAmpProvider extends <aps.CfnWorkspace> {

    /**
     * Creates the certificate provider.
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
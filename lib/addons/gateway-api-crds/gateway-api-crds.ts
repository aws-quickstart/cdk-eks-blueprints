// gateway-api-crds-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import { loadExternalYaml } from '../../utils';

const SIG_GATEWAY_API_FILE_PATH = 'standard-install.yaml';

export class GatewayApiCrdsAddOn extends cdk.NestedStack {
    public readonly manifestIds: string[] = [];

    constructor(scope: Construct, id: string, cluster: eks.ICluster, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        try {
            const yamlDocuments = loadExternalYaml(SIG_GATEWAY_API_FILE_PATH)
                .filter((manifest: Record<string, any>) => manifest && manifest.metadata && manifest.metadata.name);

            yamlDocuments.forEach((manifest: Record<string, any>) => {
                const manifestName = `sig-gateway-api-${manifest.metadata.name}`;
                return cluster.addManifest(manifestName, manifest);
            });

        } catch (error) {
            console.error('Error reading or parsing YAML file:', error);
            throw error;
        }
    }

}
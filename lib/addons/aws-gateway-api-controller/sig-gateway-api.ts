// gateway-api-crds-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const SIG_GATEWAY_API_FILE_PATH = 'standard-install.yaml'

export class GatewayApiCrdsStack extends cdk.NestedStack {
    public readonly manifestIds: string[] = [];

    constructor(scope: Construct, id: string, cluster: eks.ICluster, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        try {
            const filePath = path.resolve(__dirname, SIG_GATEWAY_API_FILE_PATH);
            const fileContent = fs.readFileSync(filePath, 'utf8');

            const yamlDocuments = fileContent.split('---')
                .filter(doc => doc.trim())
                .map(doc => yaml.load(doc) as Record<string, any>)
                .filter(manifest => manifest && manifest.metadata && manifest.metadata.name);

            yamlDocuments.forEach((manifest) => {
                const manifestName = `sig-gateway-api-${manifest.metadata.name}`;
                return cluster.addManifest(manifestName, manifest);
            });

        } catch (error) {
            console.error('Error reading or parsing YAML file:', error);
            throw error;
        }
    }
}
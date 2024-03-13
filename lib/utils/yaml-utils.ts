import * as eks from 'aws-cdk-lib/aws-eks';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

/**
 * Creates a list of PolicyDocuments for every JSON file in a directory
 * @param dir Directory path to the JSON files.
 * @returns List of PolicyDocument objects.
 */
export function createPolicyDocuments(dir: string): PolicyDocument[] {
    const policyDocuments: PolicyDocument[] = [];
    fs.readdirSync(dir, { encoding: 'utf8' }).forEach((file, _) => {
        if (file.split('.').pop() == 'json') {
            const data = fs.readFileSync(dir + file, 'utf8');
            if (data != undefined) {
                const policyDocument = PolicyDocument.fromJson(JSON.parse(data));
                policyDocuments.push(policyDocument);
            }
        }
    });
    return policyDocuments;
}

/**
 * Applies all manifests from a directory. Note: The manifests are not checked, 
 * so user must ensure the manifests have the correct namespaces. 
 * @param dir 
 * @param cluster 
 * @param namespaceManifest 
 */
export function applyYamlFromDir(dir: string, cluster: eks.ICluster, namespaceManifest: KubernetesManifest): void {
    fs.readdirSync(dir, { encoding: 'utf8' }).forEach((file, index) => {
        if (file.split('.').pop() == 'yaml') {
            const data = fs.readFileSync(dir + file, 'utf8');
            if (data != undefined) {  
                yaml.loadAll(data, function (item) {
                    const resources = cluster.addManifest(file.substring(0, file.length - 5) + index, <Record<string, any>[]>item);
                    resources.node.addDependency(namespaceManifest);
                });
            }
        }
    });
}

/**
 * Reads the YAML document from a local path. 
 * @param path YAML document path
 * @returns YAML document string
 */
export function readYamlDocument(path: string): string {
    try {
        const doc = fs.readFileSync(path, 'utf8');
        return doc;
    } catch (e) {
        console.log(e + ' for path: ' + path);
        throw e;
    }
}

/**
 * Reads the YAML document from a local path and parses them as 
 * multiple YAML documents separated by `---` as expected in a Kubernetes manifest file
 * @param path YAML document path
 * @returns a list of parsed YAML documents
 */
export function loadMultiResourceYaml(path: string): any {
    const doc = readYamlDocument(path);
    return doc.split("---").map((e: any) => loadYaml(e));
}

/**
 * Parses the sting document into a single YAML document
 * @param document document 
 * @returns yaml document
 */
export function loadYaml(document: string): any {
    return yaml.load(document);
}

/**
 * Reads the YAML document from a URL and parses 
 * multiple YAML documents separated by `---` as expected in a Kubernetes manifest file Note: The file from the URL is
 * not validated, so user must ensure the URL contains a valid manifest.
 * @param url YAML document URL
 * @returns a list of parsed YAML documents
 */
export function loadExternalYaml(url: string): any {
    /* eslint-disable */
    const request = require('sync-request'); // moved away from import as it is causing open handles that prevents jest from completion
    const response = request('GET', url);
    return yaml.loadAll(response.getBody().toString());
}

/**
 * Serializes object as a YAML document
 * @param document document 
 * @returns yaml document
 */
export function serializeYaml(document: any): string {
    return yaml.dump(document);
}
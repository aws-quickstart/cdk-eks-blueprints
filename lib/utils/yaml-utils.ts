import * as eks from '@aws-cdk/aws-eks';
import { KubernetesManifest } from '@aws-cdk/aws-eks';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import request from 'sync-request';

/**
 * Applies all manifests from a directory. Note: The manifests are not checked, 
 * so user must ensure the manifests have the correct namespaces. 
 * @param dir 
 * @param cluster 
 * @param namespaceManifest 
 */
export function applyYamlFromDir(dir: string, cluster: eks.Cluster, namespaceManifest: KubernetesManifest): void {
    fs.readdir(dir, 'utf8', (err, files) => {
        if (files != undefined) {
            files.forEach((file) => {
                if (file.split('.').pop() == 'yaml') {
                    fs.readFile(dir + file, 'utf8', (err, data) => {
                        if (data != undefined) {
                            let i = 0;
                            yaml.loadAll(data, function(item) {
                                const resources = cluster.addManifest(file.substring(0, file.length - 5) + i, <Record<string, any>[]>item);
                                resources.node.addDependency(namespaceManifest)
                                i++;
                            });
                        }
                    })
                }
            })
        } else {
            console.log(`${dir} is empty`);
        }
    })
}

export function readYamlDocument(path: string): string {
    try {
        const doc = fs.readFileSync(path, 'utf8');
        return doc;
    } catch (e) {
        console.log(e + ' for path: ' + path);
        throw e;
    }
}


export function loadYaml(document: string): any {
    return yaml.load(document);
}

export function loadExternalYaml(url: string): any {
    return yaml.loadAll(request('GET', url).getBody().toString());
}

export function serializeYaml(document: any): string {
    return yaml.dump(document);
}
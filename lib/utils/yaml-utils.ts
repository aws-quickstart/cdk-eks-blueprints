import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as eks from '@aws-cdk/aws-eks';
import request from 'sync-request';

export function readYamlFromDir(dir: string, cluster: eks.Cluster): void {
    fs.readdir(dir, 'utf8', (err, files) => {
        if (files != undefined) {
            files.forEach((file) => {
                if (file.split('.').pop() == 'yaml') {
                    fs.readFile(dir + file, 'utf8', (err, data) => {
                        if (data != undefined) {
                            let i = 0;
                            yaml.loadAll(data).forEach((item) => {
                                cluster.addManifest(file.substr(0, file.length - 5) + i, item);
                                i++;
                            })
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
    return yaml.safeLoad(document);
}

export function loadExternalYaml(url: string): any {
    return yaml.safeLoadAll(request('GET', url).getBody().toString());
}

export function serializeYaml(document: any): string {
    return yaml.safeDump(document);
}
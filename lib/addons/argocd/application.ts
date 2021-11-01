import * as dot from 'dot-object';
import { GitRepositoryReference, Values } from '../../spi';

export class ArgoApplication {

    constructor(private name: string, private namespace: string, private repo: GitRepositoryReference) {}

    public generate(values?: Values) {

        const flatValues = dot.dot(values);
        const nameValues = new Array();

        for( let key in flatValues) {
            nameValues.push({ name: key, value: flatValues[key]});
        }

        return {
            apiVersion: "argoproj.io/v1alpha1",
            kind: "Application",
            metadata: {
                name: this.name,
                namespace: this.namespace
            },
            spec: {
                destination: {
                    namespace: this.namespace,
                    server: "https://kubernetes.default.svc"
                },
                project: "default", //TODO: make project configurable
                source: {
                    helm: {
                        valueFiles: ["values.yaml"],
                        parameters: nameValues
                    },
                    path: this.repo.path,
                    repoURL: this.repo.repoUrl,
                    targetRevision: this.repo.targetRevision ?? 'HEAD'
                },
                syncPolicy: {
                    automated: {}
                }
            }
        }
    }

}
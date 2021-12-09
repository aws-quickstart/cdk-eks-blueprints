import * as dot from 'dot-object';
import { GitOpsApplicationDeployment, GitRepositoryReference } from '../../spi';

/**
 * Argo Application is a utility class that can generate an ArgoCD application
 * from generic GitOps application properties.  
 */
export class ArgoApplication {

    constructor(private readonly bootstrapRepo: GitRepositoryReference | undefined) {}

    public generate(deployment: GitOpsApplicationDeployment, syncOrder?: number) {

        const flatValues = dot.dot(deployment.values);
        const nameValues = [];

        for( let key in flatValues) {
            nameValues.push({ name: key, value: `${flatValues[key]}`});
        }

        const repository = deployment.repository ?? this.generateDefaultRepo(deployment.name);

        return {
            apiVersion: "argoproj.io/v1alpha1",
            kind: "Application",
            metadata: {
                name: deployment.name,
                namespace: 'argocd',
                annotations: {
                    "argocd.argoproj.io/sync-wave": syncOrder == undefined ? "-1" : `${syncOrder}`
                }
            },
            spec: {
                destination: {
                    namespace: deployment.namespace,
                    server: "https://kubernetes.default.svc"
                },
                project: "default", //TODO: make project configurable
                source: {
                    helm: {
                        valueFiles: ["values.yaml"],
                        parameters: nameValues
                    },
                    path: repository.path,
                    repoURL: repository.repoUrl,
                    targetRevision: repository.targetRevision ?? 'HEAD'
                },
                syncPolicy: {
                    automated: {}
                }
            }
        }
    }

    /**
     * Creates an opinionated path.
     * @param name 
     * @returns 
     */
    generateDefaultRepo(name: string): GitRepositoryReference {
        if(this.bootstrapRepo) {
            return {
                name: this.bootstrapRepo.name,
                repoUrl: this.bootstrapRepo.repoUrl,
                path: this.bootstrapRepo.path + `/addons/${name}`,
                targetRevision: this.bootstrapRepo.targetRevision
            }
        }
        throw new Error("With GitOps configuration management enabled either specify GitOps repository for each add-on or provide a bootstrap application to the ArgoCD add-on.");
    }
}
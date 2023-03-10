import * as dot from 'dot-object';
import { GitOpsApplicationDeployment, GitRepositoryReference, Values } from '../../spi';
import { escapeDots } from '../../utils';

/**
 * Argo Application is a utility class that can generate an ArgoCD application
 * from generic GitOps application properties.
 */
export class ArgoApplication {

    constructor(private readonly bootstrapRepo: GitRepositoryReference | undefined) { }

    public generate(deployment: GitOpsApplicationDeployment, syncOrder?: number) {

        const normalizedValues = this.normalizeValues(deployment.values);

        const flatValues = dot.dot(normalizedValues);

        const nameValues = [];

        for (let key in flatValues) {
            // Avoid passing the undefined values
            if (flatValues[key] !== undefined) {
                // Avoid passing the empty objects, e.g. {}
                if (Object.getPrototypeOf(flatValues[key]) !== Object.prototype) {
                    nameValues.push({ name: key, value: `${flatValues[key]}` });
                } else if (Object.getPrototypeOf(flatValues[key]) === Object.prototype && Object.keys(flatValues[key]).length != 0) {
                    nameValues.push({ name: key, value: `${flatValues[key]}` });
                }
            }
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
                        parameters: nameValues,
                    },
                    path: repository.path,
                    repoURL: repository.repoUrl,
                    targetRevision: repository.targetRevision ?? 'HEAD'
                },
                syncPolicy: {
                    automated: {
                        prune: true,
                        selfHeal: true,
                        allowEmpty: true,
                    }
                }
            }
        };
    }

    /**
     * Creates an opinionated path.
     * @param name
     * @returns
     */
    generateDefaultRepo(name: string): GitRepositoryReference {
        if (this.bootstrapRepo) {
            return {
                name: this.bootstrapRepo.name,
                repoUrl: this.bootstrapRepo.repoUrl,
                path: this.bootstrapRepo.path + `/${name}`,
                targetRevision: this.bootstrapRepo.targetRevision
            };
        }
        throw new Error("With GitOps configuration management enabled either specify GitOps repository for each add-on or provide a bootstrap application to the ArgoCD add-on.");
    }

    /**
     * Iterate an argo Values object to normalize the string format before sending to argocd.
     * For example, escaping the dot from certain keys: "ingress.annotations.kubernetes\\.io/tls-acme"
     * @param values
     * @returns
     */
    normalizeValues(obj: Values): Values {
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                obj[key] = this.normalizeValues(obj[key]);
            }

            const escapedKey = escapeDots(key);
            if (escapedKey != key) {
                obj[escapedKey] = obj[key];
                delete obj[key];
            }
        });

        return obj;
    }
}

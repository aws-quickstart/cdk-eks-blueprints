import * as dot from 'dot-object';
import { GitOpsApplicationDeployment } from '../../spi';

export class ArgoApplication {

    public generate(deployment: GitOpsApplicationDeployment, syncOrder?: number) {

        const flatValues = dot.dot(deployment.values);
        const nameValues = [];

        for( let key in flatValues) {
            nameValues.push({ name: key, value: flatValues[key]});
        }

        return {
            apiVersion: "argoproj.io/v1alpha1",
            kind: "Application",
            metadata: {
                name: deployment.application.name,
                namespace: deployment.application.namespace,
                "argocd.argoproj.io/sync-wave": syncOrder ? `${syncOrder}` : "-1"
            },
            spec: {
                destination: {
                    namespace: deployment.application.namespace,
                    server: "https://kubernetes.default.svc"
                },
                project: "default", //TODO: make project configurable
                source: {
                    helm: {
                        valueFiles: ["values.yaml"],
                        parameters: nameValues
                    },
                    path: deployment.application.repository.path,
                    repoURL: deployment.application.repository.repoUrl,
                    targetRevision: deployment.application.repository.targetRevision ?? 'HEAD'
                },
                syncPolicy: {
                    automated: {}
                }
            }
        }
    }
}
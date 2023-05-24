import * as spi from "../../spi";

/**
 * Flux Kustomization API defines a pipeline for fetching, decrypting, building, validating and applying Kustomize overlays or plain Kubernetes manifests.
 */
export class FluxKustomization {

    constructor(private readonly bootstrapRepo: spi.ApplicationRepository) {}

    public generate(namespace: string, fluxSyncInterval: string, fluxTargetNamespace: string, fluxPrune: boolean, fluxTimeout: string) {

        const repository = this.bootstrapRepo!;
        return {
            apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
            kind: "Kustomization",
            metadata: {
                name: repository.name,
                namespace: namespace
            },
            spec: {
                interval: fluxSyncInterval,
                targetNamespace: fluxTargetNamespace,
                sourceRef: {
                    kind: "GitRepository",
                    name: repository.name
                },
                path: repository.path,
                prune: fluxPrune,
                timeout: fluxTimeout,
            }
        };
    }
}

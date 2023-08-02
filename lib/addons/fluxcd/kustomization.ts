import { setPath } from "../../utils";
import * as spi from "../../spi";

/**
 * Flux Kustomization API defines a pipeline for fetching, decrypting, building, validating and applying Kustomize overlays or plain Kubernetes manifests.
 */
export class FluxKustomization {

    constructor(private readonly bootstrapRepo: spi.ApplicationRepository) {}

    public generate(name: string, namespace: string, fluxSyncInterval: string, fluxTargetNamespace: string, fluxPrune: boolean, fluxTimeout: string, bootstrapValues: spi.Values, fluxKustomizationPath: string) {
        
        const repository = this.bootstrapRepo!;
        const kustomizationManifest = {
            apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
            kind: "Kustomization",
            metadata: {
                name,
                namespace
            },
            spec: {
                interval: fluxSyncInterval,
                targetNamespace: fluxTargetNamespace,
                sourceRef: {
                    kind: "GitRepository",
                    name: repository.name
                },
                path: fluxKustomizationPath,
                prune: fluxPrune,
                timeout: fluxTimeout
            }
        };
        if (bootstrapValues) {
            setPath(kustomizationManifest, "spec.postBuild.substitute", bootstrapValues);
        }
        return kustomizationManifest;
    }
}



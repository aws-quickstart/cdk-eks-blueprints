import { setPath } from "../../utils";
import * as spi from "../../spi";

/**
 * Flux Kustomization API defines a pipeline for fetching, decrypting, building, validating and applying Kustomize overlays or plain Kubernetes manifests.
 */
export class FluxKustomization {

    constructor() {}

    public generate(name: string, repoName: string, namespace: string, fluxSyncInterval: string, fluxPrune: boolean, fluxTimeout: string, values: spi.Values, fluxKustomizationPath: string, fluxTargetNamespace?: string, fluxSourceKind?: string) {
        
        const kustomizationManifest = {
            apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
            kind: "Kustomization",
            metadata: {
                name,
                namespace
            },
            spec: {
                interval: fluxSyncInterval,
                sourceRef: {
                    kind: fluxSourceKind || "GitRepository",
                    name: repoName
                },
                path: fluxKustomizationPath,
                prune: fluxPrune,
                timeout: fluxTimeout
            }
        };
        if (values) {
            setPath(kustomizationManifest, "spec.postBuild.substitute", values);
        }
        if (fluxTargetNamespace) {
            setPath(kustomizationManifest, "spec.targetNamespace", fluxTargetNamespace);
        }
        return kustomizationManifest;
    }
}

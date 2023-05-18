import * as spi from "../../spi";
import { setPath } from "../../utils";
import { FluxBootstrapValues } from ".";

/**
 * Flux Kustomization API defines a pipeline for fetching, decrypting, building, validating and applying Kustomize overlays or plain Kubernetes manifests.
 */
export class FluxKustomization {

    constructor() {}

    public generate(namespace: string, fluxBootstrapValues: FluxBootstrapValues) {

        const kustomizationManifest =  {
            apiVersion: "kustomize.toolkit.fluxcd.io/v1beta2",
            kind: "",
            metadata: {
                name: fluxBootstrapValues.name,
                namespace: namespace
            },
            spec: {
                interval: fluxBootstrapValues.fluxSyncInterval,
                targetNamespace: fluxBootstrapValues.fluxTargetNamespace,
                sourceRef: {
                    kind: "GitRepository",
                    name: fluxBootstrapValues.name
                },
                path: fluxBootstrapValues.path,
                prune: fluxBootstrapValues.fluxPrune,
                timeout: fluxBootstrapValues.fluxTimeout,
            }
        };
        if (fluxBootstrapValues.fluxSubstitutionVariables) {
            setPath(kustomizationManifest, "spec.postBuild.substitute", fluxBootstrapValues.fluxSubstitutionVariables);
        }
        return kustomizationManifest;
    }
}

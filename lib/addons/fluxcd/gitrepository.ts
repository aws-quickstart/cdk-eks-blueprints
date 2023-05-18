import { FluxBootstrapValues } from ".";

/**
 * Flux GitRepository API defines a Source to produce an Artifact for a Git repository revision.
 */
export class FluxGitRepository {

    constructor() {}

    public generate(namespace: string, fluxBootstrapValues: FluxBootstrapValues) {

        return {
            apiVersion: "source.toolkit.fluxcd.io/v1beta2",
            kind: "GitRepository",
            metadata: {
                name: fluxBootstrapValues.name,
                namespace: namespace
            },
            spec: {
                interval: fluxBootstrapValues.fluxSyncInterval,
                url: .repoUrl,
                ref: {
                    branch: fluxBootstrapValues.targetRevision,
                },
            }
        };
    }
}

import * as spi from "../../spi";

/**
 * Flux GitRepository API defines a Source to produce an Artifact for a Git repository revision.
 */
export class FluxGitRepository {

    constructor(private readonly bootstrapRepo: spi.ApplicationRepository) {}

    public generate(namespace: string, fluxSyncInterval: string ) {

        const repository = this.bootstrapRepo!;
        return {
            apiVersion: "source.toolkit.fluxcd.io/v1beta2",
            kind: "GitRepository",
            metadata: {
                name: repository.name,
                namespace: namespace
            },
            spec: {
                interval: fluxSyncInterval,
                url: repository.repoUrl,
                ref: {
                    branch: repository.targetRevision,
                },
            }
        };
    }
}
import { FluxCDAddOnProps } from '.';
import { GitRepositoryReference } from '../../spi';
import * as spi from "../../spi";

/**
 * Flux GitRepository API defines a Source to produce an Artifact for a Git repository revision.
 */
export class FluxGitRepository {

    constructor(private readonly bootstrapRepo: spi.ApplicationRepository | undefined) {}

    public generate(fluxcdAddonProps: FluxCDAddOnProps) {

        const repository = fluxcdAddonProps.bootstrapRepo!;
        return {
            apiVersion: "source.toolkit.fluxcd.io/v1beta2",
            kind: "GitRepository",
            metadata: {
                name: repository.name,
                namespace: fluxcdAddonProps.namespace
            },
            spec: {
                interval: "5m0s",
                url: repository.repoUrl,
                ref: {
                    branch: repository.targetRevision,
                },
            }
        };
    }
}

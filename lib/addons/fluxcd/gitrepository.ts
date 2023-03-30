import { FluxCDAddOnProps } from '.';
import { GitRepositoryReference } from '../../spi';

/**
 * Flux GitRepository API defines a Source to produce an Artifact for a Git repository revision.
 */
export class FluxGitRepository {

    constructor(private readonly bootstrapRepo: GitRepositoryReference | undefined) {}

    public generate(fluxcdAddonProps: FluxCDAddOnProps) {

        const repository = this.generateDefaultRepo();
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

    /**
     * Creates an opinionated path.
     * @param name
     * @returns
     */
    generateDefaultRepo(): GitRepositoryReference {
        if (this.bootstrapRepo) {
            return {
                name: this.bootstrapRepo.name,
                repoUrl: this.bootstrapRepo.repoUrl,
                targetRevision: this.bootstrapRepo.targetRevision
            };
        }
        throw new Error("With Flux configuration management enabled either specify GitOps repository for FluxCD add-on.");
    }

}

/**
 * Chart Mapping for fields such as chart, version, managed IAM policy.
 */
export interface GitRepositoryProps {
    name: string,
    namespace: string
    interval: string,
    url: string,
    branch: string
}


/**
 * Flux GitRepository API defines a Source to produce an Artifact for a Git repository revision.
 */
export class FluxGitRepository {

    constructor() {}

    public generate(gitrepositoryprops: GitRepositoryProps) {

        return {
            apiVersion: "source.toolkit.fluxcd.io/v1beta2",
            kind: "GitRepository",
            metadata: {
                name: gitrepositoryprops.name,
                namespace: gitrepositoryprops.namespace
            },
            spec: {
                interval: gitrepositoryprops.interval,
                url: gitrepositoryprops.url,
                ref: {
                    branch: gitrepositoryprops.branch,
                },
            }
        };
    }

}

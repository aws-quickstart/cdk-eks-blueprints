import { Construct } from "@aws-cdk/core";
import { ClusterInfo, GitRepositoryReference } from ".";

/**
 * Defines a GitOps generic application by combining a reference to a git repo and target namespace where 
 * it must be deployed.
 */
export interface GitOpsApplication {
    name: string,
    repository?: GitRepositoryReference,
    namespace: string
}

/**
 * Utility type for values passed to Helm or GitOps applications.
 */
export type Values = {
    [key: string]: any;
};

/**
 * Defines GitOps application deployment that combines GitOps application with a particular
 * set of values passed from the IaC code to the GitOps engine (e.g. ArgoCD).
 */
export interface GitOpsApplicationDeployment {
    application: GitOpsApplication,
    values: Values,
    /**
     * Internal implementation manifest produced by the gitops provider in response to 
     * application generation. Mandatory for dependency management. 
     */
    manifest?: Construct
}

/**
 * GitOps deployment generator. This interface may be implemented by an add-on, such as ArgoCDAddOn
 * or independently by any other GitOps provider.
 * By default GitOps factory will inspect all add-ons for this interface implementations.
 */
export interface GitOpsDeploymentGenerator {
    generate(clusterInfo: ClusterInfo, deployment: GitOpsApplicationDeployment): Required<GitOpsApplicationDeployment>;
}
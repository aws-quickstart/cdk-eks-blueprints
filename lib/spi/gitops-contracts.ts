import { GitRepositoryReference, Values } from ".";


/**
 * Defines a GitOps generic application by combining a reference to a git repo and target namespace where 
 * it must be deployed.
 */
export interface GitOpsApplication {
    name: string,
    repository?: GitRepositoryReference,
    namespace: string | undefined
}

/**
 * Defines GitOps application deployment that combines GitOps application with a particular
 * set of values passed from the IaC code to the GitOps engine (e.g. ArgoCD).
 */
export interface GitOpsApplicationDeployment extends GitOpsApplication {
    values: Values
}

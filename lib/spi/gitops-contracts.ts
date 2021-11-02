import { Construct } from "@aws-cdk/core";
import { ClusterInfo, GitRepositoryReference } from ".";

export interface GitOpsApplication {
    name: string,
    repository?: GitRepositoryReference,
    namespace: string
}

export type Values = {
    [key: string]: any;
};


export interface GitOpsApplicationDeployment {
    application: GitOpsApplication,
    values: Values,
    /**
     * Internal implementation manifest produced by the gitops provider in response to 
     * application generation. 
     */
    manifest?: Construct
}

export interface GitOpsDeploymentGenerator {
    generate(clusterInfo: ClusterInfo, deployment: GitOpsApplicationDeployment): Required<GitOpsApplicationDeployment>;
}
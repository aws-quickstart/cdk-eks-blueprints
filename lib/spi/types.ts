import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks'

/**
 * Data type defining an application repository (git). 
 */
export interface ApplicationRepository {
    /**
     * Expected to support helm style repo at the moment
     */
    repoUrl: string,

    /** 
     * Path within the repository 
     */
    path?: string,

    /**
     * Optional name for the bootstrap application
     */
    name?: string,

    /**
     * Optional branch (defaults to main)
     */
    branch?: string,

    /**
     * Secret from AWS Secrets Manager to import credentials to access the specified git repository.
     * The secret must exist in the same region and account where the stack will run. 
     */
    credentialsSecretName?: string,

    /**
     * Depending on credentials type the arn should either point to an SSH key (plain text value)
     * or a json file with username/password attributes.
     * For TOKEN type username can be any non-empty username and token value as password.
     */
    credentialsType?: "USERNAME" | "TOKEN" | "SSH"

}

/**
 * ClusterInfo describes an EKS cluster.
 */
 export declare interface ClusterInfo {

    /**
     * The EKS cluster.
     */
    readonly cluster: Cluster;

    /**
     * Either and EKS NodeGroup for managed node groups, or and autoscaling group for self-managed.
     */
    readonly nodeGroup?: Nodegroup;

    /**
     * The autoscaling group for the cluster.
     */
    readonly autoscalingGroup?: AutoScalingGroup;

    /**
     * The Kubernetes version for the cluster.
     */
    readonly version: KubernetesVersion;
}
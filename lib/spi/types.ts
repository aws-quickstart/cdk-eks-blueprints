import * as cdk from '@aws-cdk/core';
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
     * Secret from AWS Secrets Manager to import credentials to access the specified git repository.
     * The secret must exist in the same region and account where the stack will run. 
     */
    credentialsSecretName?: string,

    /**
     * Depending on credentials type the arn should either point to an SSH key (plain text value)
     * or a json file with username/password attributes.
     * For TOKEN type per ArgoCD documentation (https://argoproj.github.io/argo-cd/user-guide/private-repositories/) 
     * username can be any non-empty username and token value as password.
     */
    credentialsType?: "USERNAME" | "TOKEN" | "SSH"

}

/**
 * Props for ClusterInfo.
 */
 export interface ClusterInfoProps {

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

/**
 * ClusterInfo desribes an EKS Cluster
 */
export class ClusterInfo {
    
    /**
     * Attributes
     */
    readonly cluster: Cluster;
    readonly version: KubernetesVersion;
    readonly nodeGroup?: Nodegroup;
    readonly autoScalingGroup?: AutoScalingGroup;
    private readonly provisionedAddOns: Map<string, cdk.Construct>;

    /**
     * Constructor for ClusterInfo
     * @param props 
     */
    constructor(props: ClusterInfoProps){
        this.cluster = props.cluster;
        this.nodeGroup = props.nodeGroup ? props.nodeGroup : undefined;
        this.autoScalingGroup = props.autoscalingGroup ? props.autoscalingGroup : undefined;
        this.provisionedAddOns = new Map<string, cdk.Construct>();
    }

    /**
     * Update provisionedAddOns map
     * @param addOn 
     * @param construct 
     */
    public addProvisionedAddOn(addOn: string, construct: cdk.Construct) {
        this.provisionedAddOns.set(addOn, construct);
    }

    /**
     * Given the addOn name, return the provisioned addOn construct
     * @param addOn 
     * @returns undefined
     */
    public getProvisionedAddOn(addOn: string): cdk.Construct | undefined {
        if (this.provisionedAddOns) {
            return this.provisionedAddOns.get(addOn);
        }
        else {
            return undefined;
        }
    }
}
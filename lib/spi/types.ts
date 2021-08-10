import * as cdk from '@aws-cdk/core';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';

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

export class ClusterInfo {
    
    readonly cluster: Cluster;
    readonly version: KubernetesVersion;
    readonly nodeGroup?: Nodegroup;
    readonly autoScalingGroup?: AutoScalingGroup;
    private readonly provisionedAddOns: Map<string, cdk.Construct>;

    /**
     * Constructor for ClusterInfo
     * @param props 
     */
    constructor(cluster: Cluster, version: KubernetesVersion, nodeGroup?: Nodegroup | AutoScalingGroup) {
        this.cluster = cluster;
        this.version = version;
        if (nodeGroup) {
            if (nodeGroup instanceof Nodegroup) {
                this.nodeGroup = nodeGroup;
            }
            else {
                this.autoScalingGroup = nodeGroup;
            }
        }
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
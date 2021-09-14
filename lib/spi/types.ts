import * as cdk from '@aws-cdk/core';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';
import { EksBlueprintProps } from '../stacks';

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
     * Optional target revision for the repository.
     */
    targetRevision?: string

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

export class ResourceContext {

    private readonly resources: Map<string, cdk.Construct> = new Map();
    private readonly resourcesByType: Map<string, cdk.Construct> = new Map();
    private readonly properties: EksBlueprintProps;

    constructor(props: EksBlueprintProps) {
        this.properties = props;
    }
    
    public add(name: string, type: string, resource: cdk.Construct) {
        this.resources.set(name, resource);
        this.resourcesByType.set(type, resource);
    }

    public get(name: string) : cdk.Construct | undefined {
        return this.resources.get(name);
    }

    public byType(type: string) : cdk.Construct | undefined {
        return this.resourcesByType.get(type);
    }
}

export class ClusterInfo {

    readonly cluster: Cluster;
    readonly version: KubernetesVersion;
    readonly nodeGroup?: Nodegroup;
    readonly autoScalingGroup?: AutoScalingGroup;
    private readonly provisionedAddOns: Map<string, cdk.Construct>;
    private readonly scheduledAddOns: Map<string, Promise<cdk.Construct>>;

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
        this.scheduledAddOns = new Map<string, Promise<cdk.Construct>>();
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
        return this.provisionedAddOns.get(addOn);
    }

    /**
     * Set the preProvisionedAddOn map with the promise for the construct
     * of the addon being provisioned
     * @param addOn
     * @param promise
     */
     public addScheduledAddOn(addOn: string, promise: Promise<cdk.Construct>) {
        this.scheduledAddOns.set(addOn, promise);
    }

    /**
     * Returns the promise for the Addon construct
     * @param addOn
     * @returns Promise<cdk.Construct>
     */
    public getScheduledAddOn(addOn: string): Promise<cdk.Construct> | undefined {
        return this.scheduledAddOns.get(addOn);
    }

    /**
     * Returns all scheduled addons
     * @returns scheduledAddOns: Map<string, Promise<cdk.Construct>>
     */
    public getAllScheduledAddons(): Map<string, Promise<cdk.Construct>> {
        return this.scheduledAddOns;
    }
}
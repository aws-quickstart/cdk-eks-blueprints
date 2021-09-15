import * as cdk from '@aws-cdk/core';
import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Cluster, KubernetesVersion, Nodegroup } from '@aws-cdk/aws-eks';
import { EksBlueprintProps } from '../stacks';
import { ResourceProvider } from '.';

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

    private readonly resources: Map<string, cdk.IResource> = new Map();

    constructor(public readonly scope: cdk.Stack, public readonly blueprintProps: EksBlueprintProps) {}
    
    public add<T extends cdk.IResource = cdk.IResource>(name: string, provider: ResourceProvider<T>) : T {
        const resource = provider.provide(this);
        console.assert(!this.resources.has(name), `Overwriting ${name} resource during execution is not allowed.`);
        this.resources.set(name, resource);
        return resource;
    }

    public get<T extends cdk.IResource = cdk.IResource>(name: string) : T | undefined {
        return <T>this.resources.get(name);
    }
}

export enum GlobalResources {
    Vpc = 'vpc',
    HostedZone = 'hosted-zone',
    Certificate = 'certificate'
}


export class ClusterInfo {

    readonly nodeGroup?: Nodegroup;
    readonly autoScalingGroup?: AutoScalingGroup;
    private readonly provisionedAddOns: Map<string, cdk.Construct>;
    private readonly scheduledAddOns: Map<string, Promise<cdk.Construct>>;
    private resourceContext: ResourceContext;

    /**
     * Constructor for ClusterInfo
     * @param props 
     */
    constructor(readonly cluster: Cluster, readonly version: KubernetesVersion, nodeGroup?: Nodegroup | AutoScalingGroup) {
        this.cluster = cluster;
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

    public getResourceContext(): ResourceContext {
        return this.resourceContext;
    }

    /**
     * Injection method to provide resource context.
     * @param resourceContext 
     */
    public setResourceContext(resourceContext: ResourceContext) {
        this.resourceContext = resourceContext;
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

    public getResource<T extends cdk.IResource>(name: string): T | undefined {
        return this.resourceContext.get<T>(name);
    }

    public getRequiredResource<T extends cdk.IResource>(name: string): T {
        const result = this.resourceContext.get<T>(name);
        console.assert(result, `Required resource ${name} is missing.`);
        return result!;
    }
}
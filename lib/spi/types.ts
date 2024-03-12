import * as assert from "assert";
import * as cdk from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import * as eks from 'aws-cdk-lib/aws-eks';
import { Construct, IConstruct } from 'constructs';
import { ResourceProvider } from '.';
import { EksBlueprintProps } from '../stacks';
import { logger } from "../utils/log-utils";
import * as constraints from '../utils/constraints-utils';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';

/**
 * Data type defining helm repositories for GitOps bootstrapping.
 */
export interface HelmRepository {
    repoUrl: string,
    name: string,
    username?: string,
    password?: string
}

/**
 * Utility type for values passed to Helm or GitOps applications.
 */
export type Values = {
    [key: string]: any;
};

/**
 * Utility type for Kubernetes taints passed to Helm or GitOps applications.
 */
export type Taint = {
    key: string,
    value?: string,
    effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute",
};

// simple types for various time-bound property values
export type Sec = `${number}s`;
export type Min = `${number}m`;
export type Hour = `${number}h`;

// Specific interface for Block Device Mapping and EBS Volume Mapping
export interface BlockDeviceMapping {
    deviceName?: string;
    virtualName?: string;
    ebs?: EbsVolumeMapping;
    noDevice?: string;
}
  
export interface EbsVolumeMapping {
    deleteOnTermination?: boolean;
    iops?: number;
    snapshotId?: string;
    volumeSize?: string;
    volumeType?: EbsDeviceVolumeType;
    kmsKeyId?: string;
    throughput?: number;
    outpostArn?: string;
    encrypted?: boolean;
}

/**
 * Interface that includes a reference to a Git repository for reuse, without credentials
 * and other access information.
 */
export interface GitRepositoryReference {
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
     * TargetRevision defines the revision of the source
     * to sync the application to. In case of Git, this can be
     * commit, tag, or branch. If omitted, will equal to HEAD.
     * In case of Helm, this is a semver tag for the Chart's version.
     */
    targetRevision?: string
}

/**
 * Data type defining an application repository (git).
 */
export interface ApplicationRepository extends GitRepositoryReference {

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
 * Adds Constraints to application repository
 */
export class ApplicationRepositoryConstraints implements constraints.ConstraintsType<ApplicationRepository> {
    credentialsSecretName = new constraints.InternetHostStringConstraint();
}

/**
 * Provides API to register resource providers and get access to the provided resources.
 */
export class ResourceContext {

    private readonly resources: Map<string, IConstruct> = new Map();

    constructor(public readonly scope: cdk.Stack, public readonly blueprintProps: EksBlueprintProps) { }

    /**
     * Adds a new resource provider and specifies the name under which the provided resource will be registered,
     * @param name Specifies the name key under which the provided resources will be registered for subsequent look-ups.
     * @param provider Implementation of the resource provider interface
     * @returns the provided resource
     */
    public add<T extends IConstruct>(name: string, provider: ResourceProvider<T>): T {
        const resource = provider.provide(this);
        assert(!this.resources.has(name), `Overwriting ${name} resource during execution is not allowed.`);
        this.resources.set(name, resource);
        return resource;
    }

    /**
     * Gets the provided resource by the supplied name.
     * @param name under which the resource provider was registered
     * @returns the resource or undefined if the specified resource was not found
     */
    public get<T extends IConstruct = IConstruct>(name: string): T | undefined {
        return <T>this.resources.get(name);
    }
}

export enum GlobalResources {
    Vpc = 'vpc',
    HostedZone = 'hosted-zone',
    Certificate = 'certificate',
    KmsKey = 'kms-key',
    Amp = 'amp',
}

/**
 * Cluster info supplies required information on the cluster configuration, registered resources and add-ons
 * which could be leveraged by the framework, add-on implementations and teams.
 */
export class ClusterInfo {

    private readonly provisionedAddOns: Map<string, Construct>;
    private readonly scheduledAddOns: Map<string, Promise<Construct>>;
    private readonly orderedAddOns: string[];
    private resourceContext: ResourceContext;
    private addonContext: Map<string, Values>;

    /**
     * Constructor for ClusterInfo
     * @param props
     */
    constructor(readonly cluster: eks.ICluster, readonly version: eks.KubernetesVersion,
        readonly nodeGroups?: eks.Nodegroup[], readonly autoscalingGroups?: AutoScalingGroup[], readonly fargateProfiles?: eks.FargateProfile[]) {
        this.cluster = cluster;
        this.provisionedAddOns = new Map<string, Construct>();
        this.scheduledAddOns = new Map<string, Promise<Construct>>();
        this.orderedAddOns = [];
        this.addonContext = new Map<string, Values>();
    }

    /**
     * Provides the resource context object associated with this instance of the EKS Blueprint.
     * @returns resource context object
     */
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
    public addProvisionedAddOn(addOn: string, construct: Construct) {
        this.orderedAddOns.forEach(e => {
            const provisionedOrdered = this.provisionedAddOns.get(e);
            if(provisionedOrdered) {
                logger.debug(`Adding dependency from ${addOn} to ${e}`);
                construct.node.addDependency(provisionedOrdered);
            }
        });
        this.provisionedAddOns.set(addOn, construct);
    }

    /**
     * Given the addOn name, return the provisioned addOn construct
     * @param addOn
     * @returns undefined
     */
    public getProvisionedAddOn(addOn: string): Construct | undefined {
        return this.provisionedAddOns.get(addOn);
    }

    /**
     * Returns all provisioned addons
     * @returns scheduledAddOns: Map<string, cdk.Construct>
     */
    public getAllProvisionedAddons(): Map<string, Construct> {
        return this.provisionedAddOns;
    }

    /**
     * Set the preProvisionedAddOn map with the promise for the construct
     * of the addon being provisioned
     * @param addOn
     * @param promise
     * @param ordered if addon depends on previous addons for completion (runs serially)
     */
    public addScheduledAddOn(addOn: string, promise: Promise<Construct>, ordered: boolean) {
        this.scheduledAddOns.set(addOn, promise);
        if (ordered) {
            this.orderedAddOns.push(addOn);
        }
    }

    /**
     * Indicates if strict ordering is applied to the addon
     * @param addOn addOn key
     * @returns 
     */
    public isOrderedAddOn(addOn: string) {
        return this.orderedAddOns.includes(addOn);
    }


    /**
     * Returns the promise for the Addon construct
     * @param addOn
     * @returns Promise<cdk.Construct>
     */
    public getScheduledAddOn(addOn: string): Promise<Construct> | undefined {
        return this.scheduledAddOns.get(addOn);
    }

    /**
     * Returns all scheduled addons
     * @returns scheduledAddOns: Map<string, Promise<cdk.Construct>>
     */
    public getAllScheduledAddons(): Map<string, Promise<Construct>> {
        return this.scheduledAddOns;
    }

    /**
     * Provides the resource registered under supplied name
     * @param name of the resource to be returned
     * @returns Resource object or undefined if no resource was found
     */
    public getResource<T extends cdk.IResource>(name: string): T | undefined {
        return this.resourceContext.get<T>(name);
    }

    /**
     * Same as {@link getResource} but will fail if the specified resource is not found
     * @param name of the resource to be returned
     * @returns Resource object (fails if not found)
     */
    public getRequiredResource<T extends cdk.IResource>(name: string): T {
        const result = this.resourceContext.get<T>(name);
        assert(result, 'Required resource ' + name + ' is missing.');
        return result!;
    }

    /**
     * Update addonContext map
     * @param addOn
     * @param Values
     */
    public addAddOnContext(addOn: string, values: Values) {
        this.addonContext.set(addOn, values);
    }

    /**
    * Returns all addon contexts
    * @returns addonContext: Map<string, Values>
    */
    public getAddOnContexts(): Map<string, Values> {
        return this.addonContext;
    }
}

/**
 * Enum type for two different GitOps operating modes
 */
export enum GitOpsMode {
    /**
     * CDK deploys the `Application` resource for each AddOn enabled or customer workloads,
     * and ArgoCD deploys the actual AddOn and workloads via GitOps based on the `Application` resource.
     */
    APPLICATION,
    /**
     * CDK deploys only one `Application` resource for the App of Apps, aka `bootstrap-apps`,
     * and ArgoCD deploys all the AddOns based on the child `Application` defined in `bootstrap-apps`.
     */
    APP_OF_APPS
}

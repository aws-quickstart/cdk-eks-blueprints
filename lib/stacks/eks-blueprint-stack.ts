import * as cdk from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Construct } from 'constructs';
import { MngClusterProvider } from '../cluster-providers/mng-cluster-provider';
import { VpcProvider } from '../resource-providers/vpc';
import * as spi from '../spi';
import * as constraints from '../utils/constraints-utils';
import * as utils from '../utils';
import { cloneDeep } from '../utils';
import { IKey } from "aws-cdk-lib/aws-kms";
import {KmsKeyProvider} from "../resource-providers/kms-key";

export class EksBlueprintProps {
    /**
     * The id for the blueprint.
     */
    readonly id: string;

    /**
     * Defaults to id if not provided
     */
    readonly name?: string;

    /**
     * Add-ons if any.
     */
    readonly addOns?: Array<spi.ClusterAddOn> = [];

    /**
     * Teams if any
     */
    readonly teams?: Array<spi.Team> = [];

    /**
     * EC2 or Fargate are supported in the blueprint but any implementation conforming the interface
     * will work
     */
    readonly clusterProvider?: spi.ClusterProvider = new MngClusterProvider();

    /**
     * Kubernetes version (must be initialized for addons to work properly)
     */
    readonly version?: KubernetesVersion = KubernetesVersion.V1_23;

    /**
     * Named resource providers to leverage for cluster resources.
     * The resource can represent Vpc, Hosting Zones or other resources, see {@link spi.ResourceType}.
     * VPC for the cluster can be registered under the name of 'vpc' or as a single provider of type
     */
    resourceProviders?: Map<string, spi.ResourceProvider> = new Map();

    /**
     * Control Plane log types to be enabled (if not passed, none)
     * If wrong types are included, will throw an error.
     */
    readonly enableControlPlaneLogTypes?: ControlPlaneLogType[];


    /**
     * If set to true and no resouce provider for KMS key is defined (under GlobalResources.KmsKey),
     * a default KMS encryption key will be used for envelope encryption of Kubernetes secrets (AWS managed new KMS key).
     * If set to false, and no resouce provider for KMS key is defined (under GlobalResources.KmsKey), then no secrets 
     * encyrption is applied.
     * 
     * Default is true.
     */
    readonly useDefaultSecretEncryption? : boolean  = true;
}

export class BlueprintPropsConstraints implements constraints.ConstraintsType<EksBlueprintProps> {
    /**
    * id can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    id = new constraints.StringConstraint(1, 63);

    /**
    * name can be no less than 1 character long, and no greater than 63 characters long.
    * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    */
    name = new constraints.StringConstraint(1, 63);
}

export const enum ControlPlaneLogType {

    API = 'api',
    AUDIT = 'audit',
    AUTHENTICATOR = 'authenticator',
    CONTROLLER_MANAGER = 'controllerManager',
    SCHEDULER = 'scheduler'
}

/**
 * Blueprint builder implements a builder pattern that improves readability (no bloated constructors)
 * and allows creating a blueprint in an abstract state that can be applied to various instantiations
 * in accounts and regions.
 */
export class BlueprintBuilder implements spi.AsyncStackBuilder {

    props: Partial<EksBlueprintProps>;
    env: {
        account?: string,
        region?: string
    };

    constructor() {
        this.props = { addOns: new Array<spi.ClusterAddOn>(), teams: new Array<spi.Team>(), resourceProviders: new Map() };
        this.env = {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION
        };
    }

    public name(name: string): this {
        this.props = { ...this.props, ...{ name } };
        return this;
    }

    public account(account?: string): this {
        this.env.account = account;
        return this;
    }

    public region(region?: string): this {
        this.env.region = region;
        return this;
    }

    public version(version: KubernetesVersion): this {
        this.props = { ...this.props, ...{ version } };
        return this;
    }

    public enableControlPlaneLogTypes(...types: ControlPlaneLogType[]): this {
        this.props = { ...this.props, ...{ enableControlPlaneLogTypes: types } };
        return this;
    }

    public withBlueprintProps(props: Partial<EksBlueprintProps>): this {
        const resourceProviders = this.props.resourceProviders!;
        this.props = { ...this.props, ...cloneDeep(props) };
        if (props.resourceProviders) {
            this.props.resourceProviders = new Map([...resourceProviders!.entries(), ...props.resourceProviders.entries()]);
        }
        return this;
    }

    public addOns(...addOns: spi.ClusterAddOn[]): this {
        this.props = { ...this.props, ...{ addOns: this.props.addOns?.concat(addOns) } };
        return this;
    }

    public clusterProvider(clusterProvider: spi.ClusterProvider) {
        this.props = { ...this.props, ...{ clusterProvider: clusterProvider } };
        return this;
    }

    public id(id: string): this {
        this.props = { ...this.props, ...{ id } };
        return this;
    }

    public teams(...teams: spi.Team[]): this {
        this.props = { ...this.props, ...{ teams: this.props.teams?.concat(teams) } };
        return this;
    }

    public resourceProvider(name: string, provider: spi.ResourceProvider): this {
        this.props.resourceProviders?.set(name, provider);
        return this;
    }

    public useDefaultSecretEncryption(useDefault: boolean): this {
        this.props = { ...this.props, ...{ useDefaultSecretEncryption: useDefault } };
        return this;
    }

    public clone(region?: string, account?: string): BlueprintBuilder {
        return new BlueprintBuilder().withBlueprintProps({ ...this.props })
            .account(account ?? this.env.account).region(region ?? this.env.region);
    }

    public build(scope: Construct, id: string, stackProps?: cdk.StackProps): EksBlueprint {
        return new EksBlueprint(scope, { ...this.props, ...{ id } },
            { ...{ env: this.env }, ...stackProps });
    }

    public async buildAsync(scope: Construct, id: string, stackProps?: cdk.StackProps): Promise<EksBlueprint> {
        return this.build(scope, id, stackProps).waitForAsyncTasks();
    }
}

/**
 * Entry point to the platform provisioning. Creates a CFN stack based on the provided configuration
 * and orchestrates provisioning of add-ons, teams and post deployment hooks.
 */
export class EksBlueprint extends cdk.Stack {

    static readonly USAGE_ID = "qs-1s1r465hk";

    private asyncTasks: Promise<void | Construct[]>;

    private clusterInfo: spi.ClusterInfo;

    public static builder(): BlueprintBuilder {
        return new BlueprintBuilder();
    }

    constructor(scope: Construct, blueprintProps: EksBlueprintProps, props?: cdk.StackProps) {
        super(scope, blueprintProps.id, utils.withUsageTracking(EksBlueprint.USAGE_ID, props));
        this.validateInput(blueprintProps);

        const resourceContext = this.provideNamedResources(blueprintProps);

        let vpcResource: IVpc | undefined = resourceContext.get(spi.GlobalResources.Vpc);

        if (!vpcResource) {
            vpcResource = resourceContext.add(spi.GlobalResources.Vpc, new VpcProvider());
        }

        const version = blueprintProps.version ?? KubernetesVersion.V1_23;
        let kmsKeyResource: IKey | undefined = resourceContext.get(spi.GlobalResources.KmsKey);

        if (!kmsKeyResource && blueprintProps.useDefaultSecretEncryption != false) {
            kmsKeyResource = resourceContext.add(spi.GlobalResources.KmsKey, new KmsKeyProvider());
        }

        blueprintProps = this.resolveDynamicProxies(blueprintProps, resourceContext);

        const clusterProvider = blueprintProps.clusterProvider ?? new MngClusterProvider({
            id: `${blueprintProps.name ?? blueprintProps.id}-ng`,
            version
        });

        this.clusterInfo = clusterProvider.createCluster(this, vpcResource!, kmsKeyResource);
        this.clusterInfo.setResourceContext(resourceContext);

        let enableLogTypes: string[] | undefined = blueprintProps.enableControlPlaneLogTypes;
        if (enableLogTypes) {
            utils.setupClusterLogging(this.clusterInfo.cluster.stack, this.clusterInfo.cluster, enableLogTypes);
        }

        const postDeploymentSteps = Array<spi.ClusterPostDeploy>();

        for (let addOn of (blueprintProps.addOns ?? [])) { // must iterate in the strict order
            const result = addOn.deploy(this.clusterInfo);
            if (result) {
                const addOnKey = utils.getAddOnNameOrId(addOn);
                this.clusterInfo.addScheduledAddOn(addOnKey, result, utils.isOrderedAddOn(addOn));
            }
            const postDeploy: any = addOn;
            if ((postDeploy as spi.ClusterPostDeploy).postDeploy !== undefined) {
                postDeploymentSteps.push(<spi.ClusterPostDeploy>postDeploy);
            }
        }

        const scheduledAddOns = this.clusterInfo.getAllScheduledAddons();
        const addOnKeys = [...scheduledAddOns.keys()];
        const promises = scheduledAddOns.values();

        this.asyncTasks = Promise.all(promises).then((constructs) => {
            constructs.forEach((construct, index) => {
                this.clusterInfo.addProvisionedAddOn(addOnKeys[index], construct);
            });

            if (blueprintProps.teams != null) {
                for (let team of blueprintProps.teams) {
                    team.setup(this.clusterInfo);
                }
            }

            for (let step of postDeploymentSteps) {
                step.postDeploy(this.clusterInfo, blueprintProps.teams ?? []);
            }
        });

        this.asyncTasks.catch(err => {
            console.error(err);
            throw new Error(err);
        });
    }

    /**
     * Since constructor cannot be marked as async, adding a separate method to wait
     * for async code to finish.
     * @returns Promise that resolves to the blueprint
     */
    public async waitForAsyncTasks(): Promise<EksBlueprint> {
        if (this.asyncTasks) {
            return this.asyncTasks.then(() => {
                return this;
            });
        }
        return Promise.resolve(this);
    }

    /**
     * This method returns all the constructs produced by during the cluster creation (e.g. add-ons).
     * May be used in testing for verification.
     * @returns cluster info object
     */
    getClusterInfo(): spi.ClusterInfo {
        return this.clusterInfo;
    }

    private provideNamedResources(blueprintProps: EksBlueprintProps): spi.ResourceContext {
        const result = new spi.ResourceContext(this, blueprintProps);

        for (let [key, value] of blueprintProps.resourceProviders ?? []) {
            result.add(key, value);
        }

        return result;
    }

    /**
     * Resolves all dynamic proxies, that substitutes resource provider proxies with the resolved values. 
     * @param blueprintProps 
     * @param resourceContext 
     * @returns a copy of blueprint props with resolved values
     */
    private resolveDynamicProxies(blueprintProps: EksBlueprintProps, resourceContext: spi.ResourceContext) : EksBlueprintProps {
        return utils.cloneDeep(blueprintProps, (value) => {
            return utils.resolveTarget(value, resourceContext);
        });
    }

    /**
     * Validates input against basic defined constraints.
     * @param blueprintProps 
     */
    private validateInput(blueprintProps: EksBlueprintProps) {
        const teamNames = new Set<string>();
        constraints.validateConstraints(new BlueprintPropsConstraints, EksBlueprintProps.name, blueprintProps);
        if (blueprintProps.teams) {
            blueprintProps.teams.forEach(e => {
                if (teamNames.has(e.name)) {
                    throw new Error(`Team ${e.name} is registered more than once`);
                }
                teamNames.add(e.name);
            });
        }
    }
}
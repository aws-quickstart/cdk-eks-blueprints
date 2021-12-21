
import { IVpc } from '@aws-cdk/aws-ec2';
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import { StackProps } from '@aws-cdk/core';
import { MngClusterProvider } from '../cluster-providers/mng-cluster-provider';
import { VpcProvider } from '../resource-providers/vpc';
import * as spi from '../spi';
import { getAddOnNameOrId, withUsageTracking } from '../utils';

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
    readonly version?: KubernetesVersion = KubernetesVersion.V1_20;

    /**
     * Named resource providers to leverage for cluster resources.
     * The resource can represent Vpc, Hosting Zones or other resources, see {@link spi.ResourceType}.
     * VPC for the cluster can be registed under the name of 'vpc' or as a single provider of type 
     */
    resourceProviders?: Map<string, spi.ResourceProvider> = new Map();

}


/**
 * Blueprint builder implements a builder pattern that improves readability (no bloated constructors)
 * and allows creating a blueprint in an abstract state that can be applied to various instantiations 
 * in accounts and regions. 
 */
export class BlueprintBuilder implements spi.AsyncStackBuilder {

    private props: Partial<EksBlueprintProps>;
    private env: {
        account?: string,
        region?: string
    }

    constructor() {
        this.props = { addOns: new Array<spi.ClusterAddOn>(), teams: new Array<spi.Team>(), resourceProviders: new Map() };
        this.env = {};
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

    public withBlueprintProps(props: Partial<EksBlueprintProps>): this {
        const resourceProviders = this.props.resourceProviders!;
        this.props = { ...this.props, ...props };
        if(props.resourceProviders) {
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

    public clone(region?: string, account?: string): BlueprintBuilder {
        return new BlueprintBuilder().withBlueprintProps({ ...this.props })
            .account(account?? this.env.account).region(region?? this.env.region);
    }

    public build(scope: cdk.Construct, id: string, stackProps?: StackProps): EksBlueprint {
        return new EksBlueprint(scope, { ...this.props, ...{ id } },
            { ...stackProps, ...{ env: this.env } });
    }

    public async buildAsync(scope: cdk.Construct, id: string, stackProps?: StackProps): Promise<EksBlueprint> {
        return this.build(scope, id, stackProps).waitForAsyncTasks();
    }
}


/**
 * Entry point to the platform provisioning. Creates a CFN stack based on the provided configuration
 * and orchestrates provisioning of add-ons, teams and post deployment hooks. 
 */
export class EksBlueprint extends cdk.Stack {

    static readonly USAGE_ID = "qs-1s1r465hk";

    private asyncTasks: Promise<void | cdk.Construct[]>;

    private clusterInfo: spi.ClusterInfo;

    public static builder(): BlueprintBuilder {
        return new BlueprintBuilder();
    }

    constructor(scope: cdk.Construct, blueprintProps: EksBlueprintProps, props?: StackProps) {
        super(scope, blueprintProps.id, withUsageTracking(EksBlueprint.USAGE_ID, props));
        this.validateInput(blueprintProps);
       
        const resourceContext = this.provideNamedResources(blueprintProps);

        let vpcResource : IVpc | undefined = resourceContext.get(spi.GlobalResources.Vpc);

        if(!vpcResource) {
            vpcResource = resourceContext.add(spi.GlobalResources.Vpc, new VpcProvider());
        }

        const version = blueprintProps.version ?? KubernetesVersion.V1_20;
        const clusterProvider = blueprintProps.clusterProvider ?? new MngClusterProvider({ version });

        this.clusterInfo = clusterProvider.createCluster(this, vpcResource!);
        this.clusterInfo.setResourceContext(resourceContext);

        const postDeploymentSteps = Array<spi.ClusterPostDeploy>();

        for (let addOn of (blueprintProps.addOns ?? [])) { // must iterate in the strict order
            const result = addOn.deploy(this.clusterInfo);
            if (result) {
                const addOnKey = getAddOnNameOrId(addOn);
                this.clusterInfo.addScheduledAddOn(addOnKey, result);
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

        this.asyncTasks.catch(err => { throw new Error(err) });
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
    getClusterInfo() : spi.ClusterInfo {
        return this.clusterInfo;
    }

    private provideNamedResources(blueprintProps: EksBlueprintProps) : spi.ResourceContext {
        const result = new spi.ResourceContext(this, blueprintProps);

        for(let [key, value] of blueprintProps.resourceProviders ?? []) {
            result.add(key, value);
        }

        return result;
    }


    private validateInput(blueprintProps: EksBlueprintProps) {
        const teamNames = new Set<string>();
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
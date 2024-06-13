import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as spi from '../spi';
import * as utils from '../utils';
import {BlueprintConstructBuilder, EksBlueprintConstruct, EksBlueprintProps} from "./eks-blueprint-construct";

/**
 * Blueprint builder implements a builder pattern that improves readability (no bloated constructors)
 * and allows creating a blueprint in an abstract state that can be applied to various instantiations
 * in accounts and regions.
 */
export class BlueprintBuilder extends BlueprintConstructBuilder implements spi.AsyncStackBuilder {
    constructor() {
        super();
    }

    public clone(region?: string, account?: string): BlueprintBuilder {
        return new BlueprintBuilder().withBlueprintProps(this.props)
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
        const eksBlueprintConstruct = new EksBlueprintConstruct(this, blueprintProps);
        this.clusterInfo = eksBlueprintConstruct.getClusterInfo();
        this.asyncTasks = eksBlueprintConstruct.getAsyncTasks();
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
}


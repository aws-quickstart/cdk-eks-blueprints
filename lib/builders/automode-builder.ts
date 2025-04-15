import { AutomodeClusterProvider, AutomodeClusterProviderProps } from "../cluster-providers";
import * as eks from "aws-cdk-lib/aws-eks"
import { merge } from "ts-deepmerge";
import { BlueprintBuilder } from "../stacks";
import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import * as addons from '../addons';
import * as spi from '../spi';
import * as utils from '../utils'
import { Construct } from "constructs";

const defaultOptions: Partial<AutomodeClusterProviderProps> = {
    version: eks.KubernetesVersion.V1_31,
    nodePools: ['system','general-purpose']
};

export class AutomodeBuilder extends BlueprintBuilder {

    public static builder(options: Partial<AutomodeClusterProviderProps>): AutomodeBuilder {
        const builder = new AutomodeBuilder();
        const mergedOptions = merge(defaultOptions, options);

        builder
            .clusterProvider(new AutomodeClusterProvider(mergedOptions))
            .addOns(
                new addons.NestedStackAddOn({
                    id: "usage-tracking-addon",
                    builder: UsageTrackingAddOn.builder(),
                }));

        return builder 
    }
}

/**
 * Nested stack that is used as tracker for GPU Accelerator
 */
class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "SOME_VALUE";

    public static builder(): spi.NestedStackBuilder {
        return {
            build(scope: Construct, id: string, props: NestedStackProps) {
                return new UsageTrackingAddOn(scope, id, props);
            }
        };
    }

    constructor(scope: Construct, id: string, props: NestedStackProps) {
        super(scope, id, utils.withUsageTracking(UsageTrackingAddOn.USAGE_ID, props));
    }
}


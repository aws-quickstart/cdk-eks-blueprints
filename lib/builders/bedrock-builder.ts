import { BlueprintBuilder } from '../stacks';
import * as utils from "../utils";
import * as addons from '../addons';
import * as spi from '../spi';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BedrockBuilder extends BlueprintBuilder {

    /**
     * This method helps you prepare a blueprint for setting up EKS cluster with 
     * usage tracking addon
     */
    public static builder(): BedrockBuilder {
        const builder = new BedrockBuilder();

        builder.addOns(
            new addons.NestedStackAddOn({
                id: "usage-tracking-addon",
                builder: UsageTrackingAddOn.builder(),
            }),
            new addons.AwsLoadBalancerControllerAddOn(),
            new addons.CoreDnsAddOn(),
            new addons.CertManagerAddOn(),
            new addons.KubeStateMetricsAddOn(),
            new addons.KubeProxyAddOn(),
            new addons.MetricsServerAddOn(),
            new addons.SSMAgentAddOn(),
            new addons.VpcCniAddOn(),
        );
        return builder;
    }
}

/**
 * Nested stack that is used as tracker
 */
class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1uijcfop9";

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
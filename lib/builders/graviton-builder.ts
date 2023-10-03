import { BlueprintBuilder } from '../stacks';
import * as utils from "../utils";
import * as addons from '../addons';
import * as spi from '../spi';
import { MngClusterProvider, MngClusterProviderProps } from '../cluster-providers';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { validateSupportedArchitecture, ArchType } from "../utils";
import merge from 'ts-deepmerge';

/**
 * Default props to be used when creating the Graviton nodes 
 * for EKS cluster
 */
const defaultOptions: Partial<MngClusterProviderProps> = {
    version: eks.KubernetesVersion.of("1.27"),
    instanceTypes:  [ec2.InstanceType.of(ec2.InstanceClass.M7G, ec2.InstanceSize.XLARGE)],
    desiredSize: 3,
    minSize: 2,
    maxSize: 5
};

/** 
 * This builder class helps you prepare a blueprint for setting up 
 * Graviton nodes with EKS cluster. The `GravitonBuilder` creates the following:
 * 1. An EKS Cluster` with passed k8s version.
 * 2. A managed graviton nodegroup for ARM64 software.
 * 3. Validates each addon is supported for the given architecture.
 * 
 * @example
 * ```typescript
 * import { GravitonBuilder }
 */

export class GravitonBuilder extends BlueprintBuilder {

    public addOns(...addOns: spi.ClusterAddOn[]): this {
        addOns.forEach(a => validateSupportedArchitecture(a.constructor.name, ArchType.ARM)); 
        return super.addOns(...addOns);
    }

    public static builder(options: Partial<MngClusterProviderProps>): GravitonBuilder {
        const builder = new GravitonBuilder();
        const mergedOptions = merge(defaultOptions, options);

        builder
            .clusterProvider(new MngClusterProvider(mergedOptions))
            .addOns(
                new addons.NestedStackAddOn({
                    id: "usage-tracking-addon",
                    builder: UsageTrackingAddOn.builder(),
                }),
                new addons.AwsLoadBalancerControllerAddOn(),
                new addons.ClusterAutoScalerAddOn(),
                new addons.KubeProxyAddOn("v1.27.1-eksbuild.1"),
                new addons.VpcCniAddOn(),
            );
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for Graviton Accelerator
 */
export class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1ub15dn1f";

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
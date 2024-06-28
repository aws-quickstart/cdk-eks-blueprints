import { NestedStack, NestedStackProps, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NestedStackBuilder } from "../spi";

/**
 * Adds usage tracking info to the stack props
 * @param usageIdentifier 
 * @param stackProps 
 * @returns 
 */
 export function withUsageTracking(usageIdentifiers: string[], stackProps?: StackProps): StackProps {
    const result =  stackProps ?? {};
    const usageString = usageIdentifiers.toString();
    const trackableDescription = `${result.description?? ""} tracking (${usageString})`.trimLeft();
    return { ...stackProps, ...{description: trackableDescription}};
}

/**
 * Nested stack that is used as tracker for Observability Accelerator
 */
export class UsageTrackingAddOn extends NestedStack {

    public static builder(usageIds: string[]): NestedStackBuilder {
        return {
            build(scope: Construct, id: string, props: NestedStackProps) {
                return new UsageTrackingAddOn(scope, id, props, usageIds);
            }
        };
    }

    constructor(scope: Construct, id: string, props: NestedStackProps, readonly usageIds: string[]) {
        super(scope, id, withUsageTracking(usageIds, props));
    }
}
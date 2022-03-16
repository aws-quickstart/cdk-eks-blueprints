import { StackProps } from "aws-cdk-lib";

/**
 * Adds usage tracking info to the stack props
 * @param usageIdentifier 
 * @param stackProps 
 * @returns 
 */
 export function withUsageTracking(usageIdentifier: string, stackProps?: StackProps): StackProps {
    const result =  stackProps ?? {};
    const trackableDescription = `${result.description?? ""} Blueprints tracking (${usageIdentifier})`.trimLeft();
    return { ...stackProps, ...{description: trackableDescription}};
}
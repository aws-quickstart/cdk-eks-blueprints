import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Generic builder interface that can produce a stack. 
 */
export interface StackBuilder {
    build(scope: Construct, id: string, stackProps? : cdk.StackProps) : cdk.Stack;
}

/**
 * Async extension for a stack builder to allow stacks produced asynchronously.
 */
export interface AsyncStackBuilder extends StackBuilder {
    buildAsync(scope: Construct, id: string, stackProps?: cdk.StackProps) : Promise<cdk.Stack>;
}

/**
 * Builder that can generated a nested stack to be deployed with the blueprint. 
 */
export interface NestedStackBuilder {
    build(scope: Construct, id: string, stackProps? : cdk.NestedStackProps) : cdk.NestedStack;
}

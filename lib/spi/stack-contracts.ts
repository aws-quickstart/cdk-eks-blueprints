import { Construct, Stack, StackProps } from "@aws-cdk/core";

export interface StackBuilder {
    build(scope: Construct, id: string, stackProps? : StackProps) : Stack;
}
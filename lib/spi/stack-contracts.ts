import { Construct, Stack, StackProps } from "@aws-cdk/core";

export interface StackBuilder {
    build(scope: Construct, id: string, stackProps? : StackProps) : Stack;
}

export interface AsyncStackBuilder extends StackBuilder {
    buildAsync(scope: Construct, id: string, stackProps?: StackProps) : Promise<Stack>;
}
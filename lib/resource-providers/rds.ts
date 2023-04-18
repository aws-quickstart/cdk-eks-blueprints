import { CfnOutput } from "aws-cdk-lib";
import * as aurora from "aws-cdk-lib/"
import { GlobalResources, ResourceContext, ResourceProvider } from "../spi";

/**
 * Aurora resource provider.
 *
 * @param name The name of the
 */
export class CreateAuroraProvider implements ResourceProvider<>
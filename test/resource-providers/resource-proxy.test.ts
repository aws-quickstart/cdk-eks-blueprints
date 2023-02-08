import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Role } from "aws-cdk-lib/aws-iam";
import * as blueprints from "../../lib";
import { EksBlueprint } from "../../lib";


describe("ResourceProxy",() => {

    test("resource proxy resolves", () => {
        
        const app = new App();
        

        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_23,
            mastersRole: blueprints.getResource(context => {
                return Role.fromRoleName(context.scope, "mastersRole", "myrole");
            }),
        });

        const stack = EksBlueprint.builder()
            .clusterProvider(clusterProvider)
            .account("123456789012")
            .region("us-east-1")
            .build(app, "resource-proxy-role");

        const template = Template.fromStack(stack);

            // Then
        template.hasResourceProperties("AWS::IAM::Role", {
            Metadata: {
                "aws:cdk:path": Match.stringLikeRegexp("MastersRole"),
            },
        });

    });

});
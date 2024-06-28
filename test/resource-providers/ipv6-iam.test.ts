import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import * as blueprints from "../../lib";
import {EksBlueprintConstruct, GlobalResources} from "../../lib";
import * as iam from "aws-cdk-lib/aws-iam";

describe("CreateIPv6NodeRoleProvider", () => {
    test("Stack is created with a new IAM role", () => {
        // Given
        const app = new App();
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
            .resourceProvider(
                "blueprint-node-role",
                new blueprints.CreateIPv6NodeRoleProvider("blueprint-ipv6-node-role",  new iam.ServicePrincipal("ec2.amazonaws.com"),
                    [
                        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
                    ]
                )
            )
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");


        // When
        const template = Template.fromStack(stack);

        // Then
        const iamRoles = template.findResources("AWS::IAM::Policy");
        const nodeRolePolicy = Object.values(iamRoles).filter(policy => {
            if (policy?.Properties?.PolicyName) {
                const nodeIpv6Policy = policy?.Properties?.PolicyName;
                if (nodeIpv6Policy && nodeIpv6Policy.includes("nodeIpv6Policy")) {
                    return true;
                }
            }
            return false;
        });
        expect(nodeRolePolicy).toBeDefined();
        expect(nodeRolePolicy.length).toEqual(1);
        expect(nodeRolePolicy[0].Properties.Roles[0].Ref).toContain('blueprintipv6noderole');
    });

    test("Stack is created with an existing node role", () => {
        // Given
        const app = new App();
        const nodeRole = new blueprints.LookupRoleProvider("node-ipv6-role");
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
            .resourceProvider("node-role", nodeRole)
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");
        const eksBlueprintConstruct = <EksBlueprintConstruct>stack.node.tryFindChild("east-test-1");
        const role = <iam.Role>eksBlueprintConstruct.node.tryFindChild('node-ipv6-role-iam-provider');
        expect(role.roleName == 'node-ipv6-role');
    });
});

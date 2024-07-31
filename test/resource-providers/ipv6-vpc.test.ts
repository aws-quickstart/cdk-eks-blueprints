import { App } from "aws-cdk-lib";
import * as blueprints from "../../lib";
import {
    GlobalResources,
} from "../../lib";
import {IpFamily} from "aws-cdk-lib/aws-eks";
import {CfnSubnet, IpProtocol, Vpc} from 'aws-cdk-lib/aws-ec2';
import * as ec2 from "aws-cdk-lib/aws-ec2";

describe("CreateIpv6VpcProvider", () => {
    test("Stack is created with a new VPC for IPv6", () => {
        // Given
        const app = new App();
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, new blueprints.Ipv6VpcProvider())
            .withBlueprintProps({
                ipFamily: IpFamily.IP_V6,
            })
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");

        const vpc = <Vpc>stack.node.tryFindChild('east-test-1-vpc');
        expect(vpc.vpcIpv6CidrBlocks);
    });

    test("getIPv6VPC in Ipv6VpcProvider will provide ipv6 vpc", () => {
        // Given
        const app = new App();
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, new blueprints.Ipv6VpcProvider())
            .withBlueprintProps({
                ipFamily: IpFamily.IP_V6,
            })
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");
        const context = stack.getClusterInfo().getResourceContext();
        const ipv6VpcProvider = new blueprints.Ipv6VpcProvider();

        // When
        const vpc = ipv6VpcProvider.getIPv6VPC(context, 'ipv6');

        //Then
        expect(vpc.node.id).toEqual('ipv6-vpc');
        expect(vpc.node.tryFindChild('ipv6cidr'));
        expect(vpc.node.tryFindChild('PublicSubnet1'));
        expect(vpc.node.tryFindChild('PrivateSubnet1'));
        expect(vpc.node.tryFindChild('IGW'));
        expect(vpc.node.tryFindChild('EIGW6'));
    });

    test("associateSubnetsWithIpv6CIDR will provide vpc subnet with ipv6 cidr", () => {
        // Given
        const app = new App();
        const ipv6VpcProvider = new blueprints.Ipv6VpcProvider();
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, ipv6VpcProvider)
            .withBlueprintProps({
                ipFamily: IpFamily.IP_V6,
            })
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");
        const context = stack.getClusterInfo().getResourceContext();

        const vpc = new ec2.Vpc(context.scope, "test-vpc", { natGateways: 1,
            ipProtocol: IpProtocol.DUAL_STACK, restrictDefaultSecurityGroup: false });

        // When
        ipv6VpcProvider.associateSubnetsWithIpv6CIDR(0, vpc.publicSubnets[0], vpc);
        const cfnSubnet = <CfnSubnet>vpc.publicSubnets[0].node.defaultChild;

        // Then
        expect(cfnSubnet.assignIpv6AddressOnCreation).toEqual(true);
        expect(cfnSubnet.ipv6CidrBlock);
    });

    test("getIPv6VPC will provide ipv6 vpc when created through VpcProvider", () => {
        // Given
        const app = new App();
        const stack = blueprints.EksBlueprint.builder()
            .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider())
            .withBlueprintProps({
                ipFamily: IpFamily.IP_V6,
            })
            .account("123456789012")
            .region("us-east-1")
            .version("auto")
            .build(app, "east-test-1");
        const vpc = <Vpc>stack.node.tryFindChild('east-test-1-vpc');
        expect(vpc.vpcIpv6CidrBlocks);
    });
});

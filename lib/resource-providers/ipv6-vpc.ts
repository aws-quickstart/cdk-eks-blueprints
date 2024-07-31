import {Fn} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import {IpProtocol, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ResourceContext, ResourceProvider } from "../spi";
import {getVPCFromId} from "./vpc";

/**
 * IPV6 VPC resource provider
 */
export class Ipv6VpcProvider implements ResourceProvider<ec2.IVpc> {
    readonly vpcId?: string;

    constructor(vpcId?: string) {
        this.vpcId = vpcId;
    }

    provide(context: ResourceContext): ec2.IVpc {
        const id = context.scope.node.id;
        let vpc = getVPCFromId(context, id, this.vpcId);
        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a one NAT Gateway to reduce the cost.
            // IPv6 does not require NAT for pod to pod communication. By default, we are creating one NAT for cluster communications outside endpoints if any.
            return this.getIPv6VPC(context, id);
        }
        return vpc;
    }

    /*
    ** AWS recommend to have dual stack vpc for ipv6 EKS clusters. This functions creates VPC required for IPV6 cluster.
    ** For more info refer: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
     */
    getIPv6VPC(context: ResourceContext, id: string):ec2.IVpc {
        // Create VPC with dual stack mode
        // Setting natGateways lower than the number of Availability Zones in VPC in order to save on NAT cost.
        const vpc = new ec2.Vpc(context.scope, id+"-vpc", { natGateways: 1,
            ipProtocol: IpProtocol.DUAL_STACK, restrictDefaultSecurityGroup: false });

        // Create and associate IPV6 CIDR blocks
        const ipv6Cidr = new ec2.CfnVPCCidrBlock(context.scope, id+"-CIDR6", {
            vpcId: vpc.vpcId,
            amazonProvidedIpv6CidrBlock: true,
        });
        let subnetCount = 0;
        let subnets = [...vpc.publicSubnets, ...vpc.privateSubnets];

        // associate an IPv6 CIDR block with a subnet
        for ( let subnet of subnets) {
            // Wait for the ipv6 cidr to complete
            subnet.node.addDependency(ipv6Cidr);
            this.associateSubnetsWithIpv6CIDR(subnetCount, subnet, vpc);
            subnetCount++;
        }
        return vpc;
    }

    /*
    ** For IPV6 vpc we need to attach subnets with available ipv6Cidr blocks in the vpc.
    ** Refer steps in here: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html
     */
    associateSubnetsWithIpv6CIDR(count: number, subnet: ec2.ISubnet, vpc: Vpc) {
        const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
        // The VPC is associated with /56 for amazonProvidedIpv6CidrBlock. So value of 64 subnet mask. so 256 cidr blocks are available.
        // Having 64 as subnet mask will give 2^64 IP's for each subnet. Which high enough for any kind of workload.
        const ipv6CIDRSubnetMask = "64";
        cfnSubnet.ipv6CidrBlock = Fn.select(count, Fn.cidr(Fn.select(0, vpc.vpcIpv6CidrBlocks), 256, ipv6CIDRSubnetMask));
        cfnSubnet.assignIpv6AddressOnCreation = true;
    }

}

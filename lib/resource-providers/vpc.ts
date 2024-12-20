import { Tags } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ISubnet, PrivateSubnet } from 'aws-cdk-lib/aws-ec2';
import { ResourceContext, ResourceProvider } from "../spi";
import * as eks from "aws-cdk-lib/aws-eks";
import {Ipv6VpcProvider} from "./ipv6-vpc";

/**
 * Interface for Mapping for fields such as Primary CIDR, Secondary CIDR, Secondary Subnet CIDR.
 */
interface VpcProps {
   primaryCidr?: string,
   secondaryCidr?: string,
   secondarySubnetCidrs?: string[]
}

/**
 * VPC resource provider 
 */
export class VpcProvider implements ResourceProvider<ec2.IVpc> {
    readonly vpcId?: string;
    readonly primaryCidr?: string;
    readonly secondaryCidr?: string;
    readonly secondarySubnetCidrs?: string[];

    constructor(vpcId?: string, private vpcProps?: VpcProps) {
        this.vpcId = vpcId;
        this.primaryCidr = vpcProps?.primaryCidr;
        this.secondaryCidr = vpcProps?.secondaryCidr;
        this.secondarySubnetCidrs = vpcProps?.secondarySubnetCidrs;
    }

    provide(context: ResourceContext): ec2.IVpc {
        const id = context.scope.node.id;
        const ipFamily = context.blueprintProps.ipFamily;

        if (ipFamily == eks.IpFamily.IP_V6) {
            const ipv6VpcProvider:Ipv6VpcProvider = new Ipv6VpcProvider(this.vpcId);
            return ipv6VpcProvider.provide(context);
        }

        let vpc = getVPCFromId(context, id, this.vpcId);
        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // If VPC CIDR range is not provided, uses `10.0.0.0/16` as the range and creates public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
            // Creates Secondary CIDR and Secondary subnets if passed.
            if (this.primaryCidr) {
                vpc = new ec2.Vpc(context.scope, id + "-vpc",{
                    ipAddresses: ec2.IpAddresses.cidr(this.primaryCidr)
                });    
            }
            else {
                vpc = new ec2.Vpc(context.scope, id + "-vpc");
            }
        }

        
        if (this.secondaryCidr) {
            this.createSecondarySubnets(context, id, vpc);
        }
    
        return vpc;
    }

    protected createSecondarySubnets(context: ResourceContext, id: string, vpc: ec2.IVpc) {
        const secondarySubnets: Array<PrivateSubnet> = [];
        const secondaryCidr = new ec2.CfnVPCCidrBlock(context.scope, id + "-secondaryCidr", {
            vpcId: vpc.vpcId,
            cidrBlock: this.secondaryCidr
        });
        secondaryCidr.node.addDependency(vpc);
        if (this.secondarySubnetCidrs) {
            for (let i = 0; i < vpc.availabilityZones.length; i++) {
                if (this.secondarySubnetCidrs[i]) {
                    secondarySubnets[i] = new ec2.PrivateSubnet(context.scope, id + "private-subnet-" + i, {
                        availabilityZone: vpc.availabilityZones[i],
                        cidrBlock: this.secondarySubnetCidrs[i],
                        vpcId: vpc.vpcId
                    });
                    secondarySubnets[i].node.addDependency(secondaryCidr);
                    context.add("secondary-cidr-subnet-" + i, {
                        provide(_context): ISubnet { return secondarySubnets[i]; }
                    });
                }
            }
            for (let secondarySubnet of secondarySubnets) {
                Tags.of(secondarySubnet).add("kubernetes.io/role/internal-elb", "1", { applyToLaunchedInstances: true });
                Tags.of(secondarySubnet).add("Name", `blueprint-construct-dev-PrivateSubnet-${secondarySubnet}`, { applyToLaunchedInstances: true });
            }
        }
    }
}



/*
** This function will give return vpc based on the ResourceContext and vpcId passed to the cluster.
 */
export function getVPCFromId(context: ResourceContext, nodeId: string, vpcId?: string) {
    let vpc = undefined;
    if (vpcId) {
        if (vpcId === "default") {
            console.log(`looking up completely default VPC`);
            vpc = ec2.Vpc.fromLookup(context.scope, nodeId + "-vpc", { isDefault: true });
        } else {
            console.log(`looking up non-default ${vpcId} VPC`);
            vpc = ec2.Vpc.fromLookup(context.scope, nodeId + "-vpc", { vpcId: vpcId });
        }
    }
    return vpc;
}

export class DirectVpcProvider implements ResourceProvider<ec2.IVpc> {
     constructor(readonly vpc: ec2.IVpc) { }

    provide(_context: ResourceContext): ec2.IVpc {
        return this.vpc;
    }    
}

/**
 * Direct import secondary subnet provider, based on a known subnet ID. 
 * Recommended method if secondary subnet id is known, as it avoids extra look-ups.
 */
export class LookupSubnetProvider implements ResourceProvider<ISubnet> {
    constructor(private subnetId: string) { }

    provide(context: ResourceContext): ec2.ISubnet {
        return ec2.Subnet.fromSubnetAttributes(context.scope, `${this.subnetId}-secondarysubnet`, {subnetId: this.subnetId});
    }
}

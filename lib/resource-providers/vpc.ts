import { NamedResourceProvider, ResourceType } from "..";
import { ResourceContext, NamedResource } from "../spi";
import * as ec2 from '@aws-cdk/aws-ec2';

/**
 * VPC resource provider 
 */
export class VpcProvider implements NamedResourceProvider<ec2.IVpc> {
    readonly name: string;
    readonly type = ResourceType.Vpc;
    readonly vpcId?: string;

    constructor(name?: string, vpcId?: string) {
        this.name = name ?? 'vpc';
        this.vpcId = vpcId;
    }

    provide(context: ResourceContext): NamedResource<ec2.IVpc> {
        const id = context.scope.node.id;
        let vpc = undefined;

        if (this.vpcId) {
            if (this.vpcId === "default") {
                console.log(`looking up completely default VPC`);
                vpc = ec2.Vpc.fromLookup(context.scope, id + "-vpc", { isDefault: true });
            } else {
                console.log(`looking up non-default ${this.vpcId} VPC`);
                vpc = ec2.Vpc.fromLookup(context.scope, id + "-vpc", { vpcId: this.vpcId });
            }
        }

        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
            vpc = new ec2.Vpc(context.scope, id + "-vpc");
        }

        return {name: this.name, type: this.type, resource: vpc};
    }
}

export class DirectVpcProvider implements NamedResourceProvider<ec2.IVpc> {
    readonly name  = 'vpc';
    readonly type = ResourceType.Vpc;

    constructor(readonly vpc: ec2.IVpc) { }

    provide(context: ResourceContext): NamedResource<ec2.IVpc> {
        return {name: this.name, type: this.type, resource: this.vpc }
    }    
}
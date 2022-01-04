import * as ec2 from '@aws-cdk/aws-ec2';
import { Tags } from '@aws-cdk/core';

/**
 * Tags Subnets within a VPC
 * @param subnets
 * @param tag
 * @param value
 */
export function tagSubnets(subnets: ec2.ISubnet[], tag: string, value: string): void {
    for (const subnet of subnets) {
        // if this is not a concrete subnet, throws an error
        if (!ec2.Subnet.isVpcSubnet(subnet)) {
            throw new Error(
                'This is not a valid subnet.'
            )
        }
        Tags.of(subnet).add(tag, value);
    }
}
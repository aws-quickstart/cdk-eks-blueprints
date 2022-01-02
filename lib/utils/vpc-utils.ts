import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';
import { Annotations, Token, Tags } from '@aws-cdk/core';

/**
 * Tags Subnets within a VPC
 * @param scope
 * @param type
 * @param subnets
 * @param tag
 * @param value
 */
export function tagSubnets(scope: cdk.Construct, subnets: ec2.ISubnet[], tag: string, value: string): void {
  for (const subnet of subnets) {
    // if this is not a concrete subnet, attach a construct warning
    if (!ec2.Subnet.isVpcSubnet(subnet)) {
      // message (if token): "could not auto-tag public/private subnet with tag..."
      // message (if not token): "count not auto-tag public/private subnet xxxxx with tag..."
      const subnetID = Token.isUnresolved(subnet.subnetId) ? '' : ` ${subnet.subnetId}`;
      Annotations.of(scope).addWarning(`Could not auto-tag subnet${subnetID} with "${tag}=1", please remember to do this manually`);
      continue;
    }
    Tags.of(subnet).add(tag, value);
  }
}
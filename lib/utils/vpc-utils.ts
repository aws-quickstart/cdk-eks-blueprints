import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Stack } from 'aws-cdk-lib';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall } from "aws-cdk-lib/custom-resources";

/**
 * Tags VPC Subnets with given tag and value.
 * @param stack 
 * @param subnetArns 
 * @param tag 
 * @param value 
 */
export function tagSubnets(stack: Stack, subnets: ec2.ISubnet[], tag: string, value: string): void {
    for (const subnet of subnets){
        if (!ec2.Subnet.isVpcSubnet(subnet)) {
            throw new Error(
                'This is not a valid subnet.'
            );
        } 
    }
    
    const tags = [{
        Key: tag,
        Value: value
    }];

    const arns = subnets.map(function(val, _){
        return `arn:${stack.partition}:ec2:${stack.region}:${stack.account}:subnet/`+val.subnetId;
    });

    const parameters = {
        Resources: subnets.map((arn) => arn.subnetId),
        Tags: tags
    };
    
    const sdkCall: AwsSdkCall = {
        service: 'EC2',
        action: 'createTags',
        parameters: parameters,
        physicalResourceId: { id: `${tag}-subnetTagger`}
    };
    
    new AwsCustomResource(stack, `subnet-tags-${tag}`, {
        policy: AwsCustomResourcePolicy.fromSdkCalls({
            resources: arns,
        }),

        onCreate: sdkCall,
        onUpdate: sdkCall,
        onDelete: { 
            ...sdkCall, 
            action: 'deleteTags',
        },
    });
}
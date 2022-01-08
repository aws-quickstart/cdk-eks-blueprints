import * as ec2 from '@aws-cdk/aws-ec2';
import { Stack } from '@aws-cdk/core';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall } from "@aws-cdk/custom-resources";

/**
 * Tags VPC Subnets with given tag and value.
 * @param stack 
 * @param subnetArns 
 * @param tag 
 * @param value 
 */
export function tagSubnets(stack: Stack, subnetArns: ec2.ISubnet[], tag: string, value: string): void {
    const tags = [{
        Key: tag,
        Value: value
    }]

    const arns = subnetArns.map(function(val, _){
        return `arn:aws:ec2:${stack.region}:${stack.account}:subnet/`+val.subnetId
    })

    const parameters = {
        Resources: subnetArns.map((arn) => arn.subnetId),
        Tags: tags
    }
    
    const sdkCall: AwsSdkCall = {
        service: 'EC2',
        action: 'createTags',
        parameters: parameters,
        physicalResourceId: { id: `${stack.stackName}-subnetTagger`}
    }
    
    new AwsCustomResource(stack, `${stack.stackName}-subnet-tags`, {
        policy: AwsCustomResourcePolicy.fromSdkCalls({
			resources: arns,
		}),

		onCreate: sdkCall,
        onUpdate: sdkCall,
		onDelete: { 
            ...sdkCall, 
            action: 'deleteTags',
		},
    })
}
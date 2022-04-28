import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Stack } from 'aws-cdk-lib';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall } from "aws-cdk-lib/custom-resources";

/**
 * Tags EC2 Security Group with given tag and value - used for EKS Security Group Tagging
 * @param stack - CDK Stack
 * @param securityGroupId - Security Group Resource ID
 * @param key - Tag Key
 * @param value - Tag Value
 */
export function tagSecurityGroup(stack: Stack, securityGroupId: string, key: string, value: string): void {
    const tags = [{
        Key: key,
        Value: value
    }];

    const arn = `arn:${stack.partition}:ec2:${stack.region}:${stack.account}:security-group/`+securityGroupId;

    const parameters = {
        Resources: [securityGroupId],
        Tags: tags
    };

    applyEC2Tag("eks-sg", stack, parameters, key, [arn]);
}

/**
 * Tags VPC Subnets with given tag and value.
 * @param stack - CDK Stack
 * @param subnets - a list of subnets
 * @param key - Tag Key
 * @param value - Tag Value
 */
export function tagSubnets(stack: Stack, subnets: ec2.ISubnet[], key: string, value: string): void {
    for (const subnet of subnets){
        if (!ec2.Subnet.isVpcSubnet(subnet)) {
            throw new Error(
                'This is not a valid subnet.'
            );
        } 
    }
    
    const tags = [{
        Key: key,
        Value: value
    }];

    const arns = subnets.map(function(val, _){
        return `arn:${stack.partition}:ec2:${stack.region}:${stack.account}:subnet/`+val.subnetId;
    });

    const parameters = {
        Resources: subnets.map((arn) => arn.subnetId),
        Tags: tags
    };

    applyEC2Tag("subnet", stack, parameters, key, arns);
}

function applyEC2Tag( id: string, stack: Stack, parameters: Record<string,any>, tag: string, resources: string[]): void {
    const sdkCall: AwsSdkCall = {
        service: 'EC2',
        action: 'createTags',
        parameters: parameters,
        physicalResourceId: { id: `${tag}-${id}-Tagger`}
    };
    
    new AwsCustomResource(stack, `${id}-tags-${tag}`, {
        policy: AwsCustomResourcePolicy.fromSdkCalls({
            resources: resources,
        }),

        onCreate: sdkCall,
        onUpdate: sdkCall,
        onDelete: { 
            ...sdkCall, 
            action: 'deleteTags',
        },
    });
}
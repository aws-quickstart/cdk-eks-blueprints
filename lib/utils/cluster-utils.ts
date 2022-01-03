import { Construct } from "@aws-cdk/core";
import * as customResource from '@aws-cdk/custom-resources';

interface Tag {
  Key: string;
  Value: string;
}

/**
 * Creates the node termination tag for the ASG
 * @param scope
 * @param autoScalingGroup 
 */
 export function tagAsg(scope: Construct, autoScalingGroup: string, tags: Tag[]): void {
  let tagList: {
    Key: string;
    Value: string;
    PropagateAtLaunch: boolean;
    ResourceId: string;
    ResourceType: string;
  }[] = [];

  tags.forEach((tag) => {
    tagList.push({
      Key: tag.Key,
      Value: tag.Value,
      PropagateAtLaunch : true,
      ResourceId: autoScalingGroup,
      ResourceType: 'auto-scaling-group'
    });
  });

  const callProps: customResource.AwsSdkCall = {
    service: 'AutoScaling',
    action: 'createOrUpdateTags',
    parameters: {
      Tags: tagList
    },
    physicalResourceId: customResource.PhysicalResourceId.of(
      `${autoScalingGroup}-asg-tag`
    )
  };

  new customResource.AwsCustomResource(scope, 'asg-tag', {
    onCreate: callProps,
    onUpdate: callProps,
    policy: customResource.AwsCustomResourcePolicy.fromSdkCalls({
      resources: customResource.AwsCustomResourcePolicy.ANY_RESOURCE
    })
  });
}
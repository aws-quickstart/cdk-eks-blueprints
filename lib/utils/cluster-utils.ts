import { Construct } from "@aws-cdk/core";
import * as customResource from '@aws-cdk/custom-resources';


/**
   * Creates the node termination tag for the ASG
   * @param scope
   * @param autoScalingGroup 
   */
 export function tagAsg(scope: Construct, autoScalingGroup: string): void {
  const callProps: customResource.AwsSdkCall = {
    service: 'AutoScaling',
    action: 'createOrUpdateTags',
    parameters: {
      Tags: [
        {
          Key: 'aws-node-termination-handler/managed',
          Value: 'true',
          PropagateAtLaunch : true,
          ResourceId: autoScalingGroup,
          ResourceType: 'auto-scaling-group'
        }
      ]
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
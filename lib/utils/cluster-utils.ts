import * as eks from "aws-cdk-lib/aws-eks";
import { Stack } from "aws-cdk-lib";
import { AwsCustomResource, AwsCustomResourcePolicy } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as customResource from 'aws-cdk-lib/custom-resources';
import { ClusterInfo } from "../spi";

// Available Control Plane logging types
const CONTROL_PLANE_LOG_TYPES = ['api','audit','authenticator','controllerManager','scheduler'];

// Enables logs for the cluster.
export function setupClusterLogging(stack: Stack, cluster: eks.Cluster, enableLogTypes: string[]): void {
	if(!enableLogTypes.every(val => CONTROL_PLANE_LOG_TYPES.includes(val))){
		throw new Error('You have included an invalid Control Plane Log Type.');
	}
	let disableLogTypes = CONTROL_PLANE_LOG_TYPES.filter(item => enableLogTypes.indexOf(item) < 0);

	new AwsCustomResource(stack, "ClusterLogsEnabler", {
		policy: AwsCustomResourcePolicy.fromSdkCalls({
			resources: [`${cluster.clusterArn}/update-config`],
		}),

		onCreate: {
			physicalResourceId: { id: `${cluster.clusterArn}/LogsEnabler` },
			service: "EKS",
			action: "updateClusterConfig",
			region: stack.region,
			parameters: {
				name: cluster.clusterName,
				logging: {
					clusterLogging: [
						{
							enabled: true,
							types: enableLogTypes,
						},
					],
				},
			},
		},
		onDelete: {
			physicalResourceId: { id: `${cluster.clusterArn}/LogsEnabler` },
			service: "EKS",
			action: "updateClusterConfig",
			region: stack.region,
			parameters: {
				name: cluster.clusterName,
				logging: {
					clusterLogging: [
						{
							enabled: false,
							types: CONTROL_PLANE_LOG_TYPES,
						},
					],
				},
			},
		},
		onUpdate: {
			physicalResourceId: { id: `${cluster.clusterArn}/LogsEnabler` },
			service: "EKS",
			action: "updateClusterConfig",
			region: stack.region,
			parameters: {
				name: cluster.clusterName,
				logging: {
					clusterLogging: [
						{
							enabled: true,
							types: enableLogTypes,
						},
						{
							enabled: false,
							types: disableLogTypes,
						},
					],
				},
			},
		},
	});
}

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

/**
 * Makes the provided construct run before any capacity (worker nodes) is provisioned on the clusster.
 * Useful for control plane add-ons, such as VPC-CNI that must be provisioned before EC2 (or Fargate) capacity is added.
 * @param construct identifies construct (such as core add-on) that should be provisioned before capacity
 * @param clusterInfo cluster provisioning context
 */
export function deployBeforeCapacity(construct: Construct, clusterInfo: ClusterInfo) {
    let allCapacity : Construct[]  = [];
    allCapacity = allCapacity.concat(clusterInfo.nodeGroups ?? [])
        .concat(clusterInfo.autoscalingGroups ?? [])
        .concat(clusterInfo.fargateProfiles ?? []);
    allCapacity.forEach(v => v.node.addDependency(construct));
}
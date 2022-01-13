import * as eks from "@aws-cdk/aws-eks";
import { Stack } from "@aws-cdk/core";
import { AwsCustomResource, AwsCustomResourcePolicy } from "@aws-cdk/custom-resources";

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
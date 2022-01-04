import * as eks from "@aws-cdk/aws-eks";
import { Stack } from "@aws-cdk/core";
import { AwsCustomResource, AwsCustomResourcePolicy } from "@aws-cdk/custom-resources";

// Enables logs for the cluster.
export function setupClusterLogging(stack: Stack, cluster: eks.Cluster): void {
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
							types: [
								"api",
								"audit",
								"authenticator",
								"controllerManager",
								"scheduler",
							],
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
							types: [
								"api",
								"audit",
								"authenticator",
								"controllerManager",
								"scheduler",
							],
						},
					],
				},
			},
		},
	});
}
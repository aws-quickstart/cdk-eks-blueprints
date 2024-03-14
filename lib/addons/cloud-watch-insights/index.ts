import {Construct} from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import {ClusterInfo} from "../../spi";
import {conflictsWith, createNamespace, supportsALL} from "../../utils";
import {CoreAddOn, CoreAddOnProps} from "../core-addon";
import {ebsCollectorPolicy} from "./iam-policy";
import {ManagedPolicy} from "aws-cdk-lib/aws-iam";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
  [KubernetesVersion.V1_29, "v1.3.1-eksbuild.1"],
  [KubernetesVersion.V1_28, "v1.3.1-eksbuild.1"],
  [KubernetesVersion.V1_27, "v1.3.1-eksbuild.1"],
  [KubernetesVersion.V1_26, "v1.3.1-eksbuild.1"],
]);

/**
 * Configuration options for AWS Container Insights add-on.
 */
export type CloudWatchInsightsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName" | "version"> & {
  /**
   * Gives CloudWatch agent access to EBS performance systems by adding an IAM role as defined here:
   * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html#install-CloudWatch-Observability-EKS-addon-configuration
   */
  ebsPerformanceLogs?: boolean,
  /**
   * Custom CloudWatch Agent configuration, specifics can be found here:
   * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html#install-CloudWatch-Observability-EKS-addon-configuration
   */
  customCloudWatchAgentConfig?: string,

  /**
   * Define the CloudWatch Agent configuration
   */
  version?: string,
};

const defaultProps = {
  addOnName: "amazon-cloudwatch-observability",
  version: "auto",
  versionMap: versionMap,
  saName: "cloudwatch-agent",
  namespace: "amazon-cloudwatch"
};

/**
 * Implementation of AWS CloudWatch Insights Addon
 */
@supportsALL
export class CloudWatchInsights extends CoreAddOn {

  readonly options: CloudWatchInsightsAddOnProps;

    constructor(props?: CloudWatchInsightsAddOnProps) {
      super({ ...defaultProps, ...props });

      this.options = props ?? {};
    }

    @conflictsWith("AdotCollectorAddon", "CloudWatchAdotAddon", "CloudWatchLogsAddon")
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
      const cluster = clusterInfo.cluster;
      const context = clusterInfo.getResourceContext();

      const insightsSA = cluster.addServiceAccount("CloudWatchInsightsSA", {
        name: defaultProps.saName,
        namespace: defaultProps.namespace
      });

      const insightsNamespace = createNamespace(defaultProps.namespace,  cluster);

      insightsSA.node.addDependency(insightsNamespace);

      insightsSA.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
      insightsSA.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));

      const insightsAddon = new eks.CfnAddon(context.scope,  "CloudWatchInsightsAddon", {
        addonName: defaultProps.addOnName,
        clusterName: cluster.clusterName,
        addonVersion: defaultProps.version,
        serviceAccountRoleArn: insightsSA.role.roleArn,
      });
      insightsAddon.node.addDependency(insightsSA);
      insightsAddon.node.addDependency(insightsNamespace);

      if (this.options.ebsPerformanceLogs != undefined && this.options.ebsPerformanceLogs) {
        insightsSA.role.attachInlinePolicy(
          new iam.Policy(context.scope, "EbsPerformanceLogsPolicy", {
            document: ebsCollectorPolicy()
          })
        );
      }

      return Promise.resolve(insightsAddon);
    }
}

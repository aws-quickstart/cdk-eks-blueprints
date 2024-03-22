import {Construct} from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import {ClusterInfo, Values} from "../../spi";
import {conflictsWith, supportsALL} from "../../utils";
import {CoreAddOn, CoreAddOnProps} from "../core-addon";
import {ebsCollectorPolicy} from "./iam-policy";
import {IManagedPolicy, ManagedPolicy} from "aws-cdk-lib/aws-iam";
import {KubernetesVersion, ServiceAccount} from "aws-cdk-lib/aws-eks";

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
  customCloudWatchAgentConfig?: Values,

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
      super({
        addOnName: defaultProps.addOnName,
        version: props?.version ?? defaultProps.version,
        versionMap: defaultProps.versionMap,
        saName: defaultProps.saName,
        namespace: defaultProps.namespace,
        configurationValues: props?.customCloudWatchAgentConfig ?? {},
        controlPlaneAddOn: false
      });

      this.options = props ?? {};
    }

    @conflictsWith("AdotCollectorAddon", "CloudWatchAdotAddon", "CloudWatchLogsAddon")
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
      return super.deploy(clusterInfo);
    }

    createServiceAccount(clusterInfo: ClusterInfo, saNamespace: string, _policies: IManagedPolicy[]): ServiceAccount {
      const sa = clusterInfo.cluster.addServiceAccount('CloudWatchInsightsSA', {
        name: defaultProps.saName,
        namespace: saNamespace
      });

      sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
      sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AWSXrayWriteOnlyAccess'));

      if (this.options.ebsPerformanceLogs != undefined && this.options.ebsPerformanceLogs) {
        sa.role.attachInlinePolicy(
          new iam.Policy(clusterInfo.cluster.stack, "EbsPerformanceLogsPolicy", {
            document: ebsCollectorPolicy()
          })
        );
      }

      return sa;
    }
}

import {Construct, IConstruct} from 'constructs';
import {IManagedPolicy, ManagedPolicy} from "aws-cdk-lib/aws-iam";
import {ClusterInfo, Values} from "../../spi";
import {conflictsWith, createNamespace as makeNamespace, supportsALL} from "../../utils";
import {CoreAddOn, CoreAddOnProps} from "../core-addon";
import {ebsCollectorPolicy} from "./iam-policy";
import {KubernetesVersion} from "aws-cdk-lib/aws-eks";

// Can be easily retrived from the aws cli with:
// aws eks describe-addon-versions --kubernetes-version <kubernetes-version> --addon-name amazon-cloudwatch-observability \
//     --query 'addons[].addonVersions[].{Version: addonVersion, Defaultversion: compatibilities[0].defaultVersion}' --output table
const versionMap: Map<KubernetesVersion, string> = new Map([
  [KubernetesVersion.V1_29, "v1.7.0-eksbuild.1"],
  [KubernetesVersion.V1_28, "v1.7.0-eksbuild.1"],
  [KubernetesVersion.V1_27, "v1.7.0-eksbuild.1"],
  [KubernetesVersion.V1_26, "v1.7.0-eksbuild.1"],
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

  createNamespace(clusterInfo: ClusterInfo, namespaceName: string): IConstruct | undefined {
    return makeNamespace(namespaceName, clusterInfo.cluster);
  }

  provideManagedPolicies(clusterInfo: ClusterInfo): IManagedPolicy[] | undefined {
    const requiredPolicies = [
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy"),
      ManagedPolicy.fromAwsManagedPolicyName("AWSXrayWriteOnlyAccess")
    ];

    if (this.options.ebsPerformanceLogs != undefined && this.options.ebsPerformanceLogs) {
      const ebsPolicy = new ManagedPolicy(clusterInfo.cluster, 'cloudwatch-agent-mangaed-policy', {
        document: ebsCollectorPolicy()
      });
      requiredPolicies.push(ebsPolicy);
    }

    return requiredPolicies;
  }
}

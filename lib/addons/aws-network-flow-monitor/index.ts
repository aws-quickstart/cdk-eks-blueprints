import { ClusterInfo, Values } from "../../spi";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import * as utils from "../../utils";
import { IdentityType, KubernetesVersion } from "aws-cdk-lib/aws-eks-v2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct, IConstruct } from "constructs";
import { EksPodIdentityAgentAddOn } from "../eks-pod-identity-agent";

export interface AwsNetworkFlowMonitorAddOnProps {
  openMetrics?: string;

  openMetricsPort?: number;

  openMetricsAddress?: string;
}

/* VersioMap showing the default version for supported Kubernetes versions */
const versionMap: Map<KubernetesVersion, string> = new Map([
  [KubernetesVersion.V1_35, "v1.1.3-eksbuild.3"],
  [KubernetesVersion.V1_34, "v1.1.3-eksbuild.2"],
  [KubernetesVersion.V1_33, "v1.1.3-eksbuild.2"],
  [KubernetesVersion.V1_32, "v1.1.3-eksbuild.2"],
  [KubernetesVersion.V1_31, "v1.1.1-eksbuild.1"],
  [KubernetesVersion.V1_30, "v1.1.1-eksbuild.1"],
  [KubernetesVersion.V1_29, "v1.1.1-eksbuild.1"],
  [KubernetesVersion.V1_28, "v1.1.1-eksbuild.1"],
  [KubernetesVersion.V1_27, "v1.0.3-eksbuild.1"],
  [KubernetesVersion.V1_26, "v1.0.2-eksbuild.5"],
]);

/**
 * Default values for the add-on
 */
const defaultProps: CoreAddOnProps = {
  addOnName: "aws-network-flow-monitoring-agent",
  version: "auto",
  versionMap: versionMap,
  namespace: "amazon-network-flow-monitor",
  saName: "aws-network-flow-monitor-agent-service-account",
  saType: IdentityType.POD_IDENTITY
};

/**
 * Implementation of Network Flow Monitor Agent addon for EKS
 */
@utils.supportsALL
export class AwsNetworkFlowMonitorAddOn extends CoreAddOn {

  readonly awsNetworkFlowMonitorAddOnProps: AwsNetworkFlowMonitorAddOnProps;

  constructor(props?: AwsNetworkFlowMonitorAddOnProps) {
    super({ ...defaultProps, ...props });
    this.awsNetworkFlowMonitorAddOnProps = { ...defaultProps, ...props };
    (this.coreAddOnProps.configurationValues as any) = populateNFMAddonConfigurationValues(props);
  }

  @utils.dependable(EksPodIdentityAgentAddOn.name)
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    return super.deploy(clusterInfo);
  }

  createNamespace(clusterInfo: ClusterInfo, namespaceName: string): IConstruct | undefined {
    return utils.createNamespace(namespaceName, clusterInfo.cluster);
  }

  /**
   * Override method to return required managed policies for the service account.
   */
  provideManagedPolicies(_clusterInfo: ClusterInfo): iam.IManagedPolicy[] | undefined {
    return [iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchNetworkFlowMonitorAgentPublishPolicy")];
  }


}

function populateNFMAddonConfigurationValues(props?: AwsNetworkFlowMonitorAddOnProps): Values {
  const values: Values = {
    env: {
      OPEN_METRICS: props?.openMetrics,
      OPEN_METRICS_PORT: props?.openMetricsPort,
      OPEN_METRICS_ADDRESS: props?.openMetricsAddress
    }
  };

  return values;
}


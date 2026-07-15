import { KubernetesVersion } from "aws-cdk-lib/aws-eks-v2";
import * as utils from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { ClusterInfo } from "../../spi/types";
import { Construct } from "constructs";

const versionMap: Map<KubernetesVersion, string> = new Map([
  [KubernetesVersion.V1_35, "v1.35.0-eksbuild.2"],
  [KubernetesVersion.V1_34, "v1.34.0-eksbuild.2"],
  [KubernetesVersion.V1_33, "v1.33.3-eksbuild.4"],
  [KubernetesVersion.V1_32, "v1.32.6-eksbuild.12"],
  [KubernetesVersion.V1_31, "v1.31.10-eksbuild.12"],
  [KubernetesVersion.V1_30, "v1.30.0-eksbuild.3"],
  [KubernetesVersion.V1_29, "v1.29.0-eksbuild.1"],
  [KubernetesVersion.V1_28, "v1.28.2-eksbuild.2"],
  [KubernetesVersion.V1_27, "v1.27.6-eksbuild.2"],
  [KubernetesVersion.V1_26, "v1.26.9-eksbuild.2"],
]);

/**
 * Configuration options for the kube-proxy add-on.
 */
export type kubeProxyAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName" | "version" >;

const defaultProps = {
    addOnName: "kube-proxy",
    saName: "kube-proxy",
    versionMap: versionMap,
};

/**
 * Implementation of KubeProxy EKS add-on.
 */
@utils.supportsALL
export class KubeProxyAddOn extends CoreAddOn {

    @utils.conflictsWithAutoMode(utils.AutoModeConflictType.VERSION_MISMATCH, "v1.29.10-eksbuild.3")
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        return super.deploy(clusterInfo);
    }

    constructor(version?: string, props?: kubeProxyAddOnProps) {
        super({
            version: version ?? "auto",
            ... defaultProps,
            ... props
        });
    }
}

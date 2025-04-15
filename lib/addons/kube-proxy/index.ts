import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import * as utils from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { ClusterInfo } from "../../spi/types";
import { Construct } from "constructs";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_31, "v1.31.0-eksbuild.5"],
    [KubernetesVersion.V1_30, "v1.30.0-eksbuild.3"],
    [KubernetesVersion.V1_29, "v1.29.0-eksbuild.1"],
    [KubernetesVersion.V1_28, "v1.28.2-eksbuild.2"],
    [KubernetesVersion.V1_27, "v1.27.6-eksbuild.2"],
    [KubernetesVersion.V1_26, "v1.26.9-eksbuild.2"],
]);

/**
 * Configuration options for the coredns add-on.
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

    @utils.autoMode()
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

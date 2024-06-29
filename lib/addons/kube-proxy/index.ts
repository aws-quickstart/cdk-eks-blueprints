import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { supportsALL } from "../../utils";

const versionMap: Map<KubernetesVersion, string> = new Map([
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
@supportsALL
export class KubeProxyAddOn extends CoreAddOn {

    constructor(version?: string, props?: kubeProxyAddOnProps) {
        super({
            version: version ?? "auto",
            ... defaultProps,
            ... props
        });
    }
}

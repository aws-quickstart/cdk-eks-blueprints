import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { CoreAddOn } from "../core-addon";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.of("1.27"), "v1.27.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.26.2-eksbuild.1"],
    [KubernetesVersion.V1_25, "v1.25.6-eksbuild.1"],
    [KubernetesVersion.V1_24, "v1.24.7-eksbuild.2"],
    [KubernetesVersion.V1_23, "v1.23.7-eksbuild.1"],
]);

/**
 * Implementation of KubeProxy EKS add-on.
 */
export class KubeProxyAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "kube-proxy",
            version: version ?? "auto",
            saName: "kube-proxy",
            versionMap: versionMap,
        });
    }
}

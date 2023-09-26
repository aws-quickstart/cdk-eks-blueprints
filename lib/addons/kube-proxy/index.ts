import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { arch, ArchType } from "../../utils";
import { ClusterInfo } from "../../spi";
import { Construct } from "constructs/lib/construct";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_27, "v1.27.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.26.2-eksbuild.1"],
    [KubernetesVersion.V1_25, "v1.25.6-eksbuild.1"],
    [KubernetesVersion.V1_24, "v1.24.7-eksbuild.2"],
    [KubernetesVersion.V1_23, "v1.23.7-eksbuild.1"],
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
export class KubeProxyAddOn extends CoreAddOn {

    constructor(version?: string, props?: kubeProxyAddOnProps) {
        super({
            version: version ?? "auto",
            ... defaultProps,
            ... props
        });
    }

    @arch(ArchType.X86,ArchType.ARM)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        return super.deploy(clusterInfo);
    }
}

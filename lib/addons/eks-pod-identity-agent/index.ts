import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import { CoreAddOn } from "../core-addon";
import { Cluster, KubernetesVersion } from "aws-cdk-lib/aws-eks-v2";
import * as utils from "../../utils";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_35, "v1.3.10-eksbuild.2"],
    [KubernetesVersion.V1_34, "v1.3.10-eksbuild.2"],
    [KubernetesVersion.V1_33, "v1.3.10-eksbuild.2"],
    [KubernetesVersion.V1_32, "v1.3.10-eksbuild.2"],
    [KubernetesVersion.V1_31, "v1.3.10-eksbuild.2"],
    [KubernetesVersion.V1_30, "v1.3.2-eksbuild.2"],
    [KubernetesVersion.V1_29, "v1.3.2-eksbuild.2"],
    [KubernetesVersion.V1_28, "v1.3.2-eksbuild.2"],
    [KubernetesVersion.V1_27, "v1.3.2-eksbuild.2"],
    [KubernetesVersion.V1_26, "v1.3.2-eksbuild.2"],
]);

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: 'eks-pod-identity-agent',
    version: 'auto',
    versionMap: versionMap,
    saName: "eks-pod-identity-agent-sa",
};

/**
 * Implementation of Amazon EKS Pod Identity Agent add-on.
 */
@utils.supportsALL
export class EksPodIdentityAgentAddOn extends CoreAddOn {

    @utils.conflictsWithAutoMode(utils.AutoModeConflictType.VERSION_MISMATCH, 'v1.3.4-eksbuild.1')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const addon = super.deploy(clusterInfo);
        (clusterInfo.cluster as Cluster)["_eksPodIdentityAgent"] = addon; // Bug in cdk: if not specified will automatically create another eks-pod-identity-agent addon
        return addon;
    }

    constructor(version?: string) {
        super({
            addOnName: defaultProps.addOnName,
            version: version ?? defaultProps.version,
            saName: defaultProps.saName,
            versionMap: defaultProps.versionMap
        });
    }
}

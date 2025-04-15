import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import { CoreAddOn } from "../core-addon";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import * as utils from "../../utils"

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_31, "v1.3.2-eksbuild.2"],
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
export class EksPodIdentityAgentAddOn extends CoreAddOn {

    @utils.autoMode()
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        return super.deploy(clusterInfo);
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

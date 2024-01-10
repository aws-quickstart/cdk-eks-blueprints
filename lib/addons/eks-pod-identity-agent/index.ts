import { CoreAddOn } from "../core-addon";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_28, "v1.0.0-eksbuild.1"],
    [KubernetesVersion.V1_27, "v1.0.0-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.0.0-eksbuild.1"]
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

    constructor(version?: string) {
        super({
            addOnName: defaultProps.addOnName,
            version: version ?? defaultProps.version,
            saName: defaultProps.saName,
            versionMap: defaultProps.versionMap
        });
    }
}
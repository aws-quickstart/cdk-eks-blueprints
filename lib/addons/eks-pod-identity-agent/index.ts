import { CoreAddOn } from "../core-addon";

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: 'eks-pod-identity-agent',
    version: 'v1.0.0-eksbuild.1',
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
        });
    }
}
import { CoreAddOn } from "../core-addon";

/**
 * Interface for Upbound Universal Crossplane EKS add-on options
 */
interface UpboundUniversalCrossplaneAddOnProps {
    /**
     * Version of the driver to deploy
     */
    version?: string;
}

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: "upbound_universal-crossplane",
    version: "v1.9.1-eksbuild.0"
};

/**
 * Implementation of EBS CSI Driver EKS add-on
 */
export class UpboundUniversalCrossplaneAddOn extends CoreAddOn {

    constructor(readonly options?: UpboundUniversalCrossplaneAddOnProps) {
        super({
            addOnName: defaultProps.addOnName,
            version: options?.version ?? defaultProps.version,
            saName: ""
        });
    }
}


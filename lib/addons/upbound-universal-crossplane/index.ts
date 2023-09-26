import { Construct } from "constructs/lib/construct";
import { ClusterInfo } from "../../spi";
import { CoreAddOn } from "../core-addon";
import { ArchType, arch } from "../../utils";

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
 * Implementation of Upbound Crossplane EKS add-on
 */
export class UpboundUniversalCrossplaneAddOn extends CoreAddOn {

    constructor(readonly options?: UpboundUniversalCrossplaneAddOnProps) {
        super({
            addOnName: defaultProps.addOnName,
            version: options?.version ?? defaultProps.version,
            saName: ""
        });
    }
    
    @arch(ArchType.X86)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        return super.deploy(clusterInfo);
    }

}


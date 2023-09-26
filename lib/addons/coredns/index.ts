import { Construct } from "constructs/lib/construct";
import { ClusterInfo } from "../../spi";
import { ArchType, arch } from "../../utils";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";

/**
 * Configuration options for the coredns add-on.
 */
export type CoreDnsAddOnProps = Omit<CoreAddOnProps, "saName" | "addOnName">;

const defaultProps = {
    addOnName: 'coredns',
    version: 'v1.10.1-eksbuild.2',
    saName: 'coredns',
    configurationValues: {}
};

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(props?: CoreDnsAddOnProps) {
        super({ ...defaultProps, ...props });
    }

    @arch(ArchType.X86,ArchType.ARM)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        return super.deploy(clusterInfo);
    }
}

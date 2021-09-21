import { EksManagedCoreAddOns } from "../eks-managed-core-addOns";

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends EksManagedCoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "coredns",
            version: version ?? "v1.8.0-eksbuild.1"
        });
    }
}

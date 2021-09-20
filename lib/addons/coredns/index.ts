import { EksManagedCoreAddons } from "../eks-managed-core-addons";

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends EksManagedCoreAddons {

    constructor(version?: string) {
        super({
            addonName: "coredns",
            version: version ?? "v1.8.0-eksbuild.1"
        });
    }
}

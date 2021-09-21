import { CoreAddOns } from "../core-addons";

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "coredns",
            version: version ?? "v1.8.0-eksbuild.1"
        });
    }
}

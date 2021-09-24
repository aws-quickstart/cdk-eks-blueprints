import { CoreAddOn } from "../core-addon";

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "coredns",
            version: version ?? "v1.8.0-eksbuild.1"
        });
    }
}

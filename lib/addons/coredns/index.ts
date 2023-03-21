import { CoreAddOn } from "../core-addon";

/**
 * Implementation of CoreDns EKS add-on.
 */
export class CoreDnsAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "coredns",
            version: version ?? "v1.9.3-eksbuild.2",
            saName: "coredns"
        });
    }
}

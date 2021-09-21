import { CoreAddOns } from "../core-addons";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends CoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.7.5-eksbuild.2"
        });
    }
}
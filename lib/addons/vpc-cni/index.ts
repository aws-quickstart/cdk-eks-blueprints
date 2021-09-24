import { CoreAddOn } from "../core-addon";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.7.5-eksbuild.2"
        });
    }
}
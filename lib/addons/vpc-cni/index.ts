import { CoreAddOn } from "../core-addon";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.11.2-eksbuild.1",
            saName: "vpc-cni"
        });
    }
}
import { EksManagedCoreAddOns } from "../eks-managed-core-addOns";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends EksManagedCoreAddOns {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.7.5-eksbuild.2"
        });
    }
}
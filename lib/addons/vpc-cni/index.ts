import { EksManagedCoreAddons } from "../eks-managed-core-addons";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends EksManagedCoreAddons {

    constructor(version?: string) {
        super({
            addonName: "vpc-cni",
            version: version ?? "v1.7.5-eksbuild.2"
        });
    }
}
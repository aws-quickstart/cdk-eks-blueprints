import { CoreAddOn } from "../core-addon";
import { getVpcCniDriverPolicyDocument } from "./iam-policy";

/**
 * Implementation of VpcCni EKS add-on.
 */
export class VpcCniAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: "vpc-cni",
            version: version ?? "v1.12.0-eksbuild.1",
            saName: "vpc-cni",
            policyDocumentProvider: getVpcCniDriverPolicyDocument
        });
    }
}
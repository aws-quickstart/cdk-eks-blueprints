import { CoreAddOn } from "../core-addon";
import { getEbsDriverPolicyDocument } from "./iam-policy";

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: 'aws-ebs-csi-driver',
    version: 'v1.5.1-eksbuild.1'
};

/**
 * Implementation of EBS CSI Driver EKS add-on.
 */
export class EbsCsiDriverAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: defaultProps.addOnName,
            version: version ?? defaultProps.version,
            policyDocumentProvider: getEbsDriverPolicyDocument
        });
    }
}
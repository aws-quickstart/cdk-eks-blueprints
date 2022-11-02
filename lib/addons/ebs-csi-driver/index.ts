import { CoreAddOn } from "../core-addon";
import { getEbsDriverPolicyDocument } from "./iam-policy";

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: 'aws-ebs-csi-driver',
    version: 'v1.11.4-eksbuild.1',
    saName: 'ebs-csi-controller-sa'
};

/**
 * Implementation of EBS CSI Driver EKS add-on.
 */
export class EbsCsiDriverAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: defaultProps.addOnName,
            version: version ?? defaultProps.version,
            saName: defaultProps.saName,
            policyDocumentProvider: getEbsDriverPolicyDocument
        });
    }
}
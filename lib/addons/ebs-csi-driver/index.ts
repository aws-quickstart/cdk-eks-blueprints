import { CoreAddOn } from "../core-addon";
import { PolicyDocument} from "@aws-cdk/aws-iam";
import {AmazonEksEbsCsiDriverPolicy} from "./iam-policy";

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: 'aws-ebs-csi-driver',
    version: 'v1.4.0-eksbuild.preview'
};

/**
 * Implementation of EBS CSI Driver EKS add-on.
 */
export class EbsCsiDriverAddOn extends CoreAddOn {

    constructor(version?: string) {
        super({
            addOnName: defaultProps.addOnName,
            version: version ?? defaultProps.version,
            policyDocument: PolicyDocument.fromJson(AmazonEksEbsCsiDriverPolicy)
        });
    }
}
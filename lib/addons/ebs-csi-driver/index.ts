import { PolicyDocument } from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { ClusterInfo } from "../../spi";
import { CoreAddOn } from "../core-addon";
import { getEbsDriverPolicyDocument } from "./iam-policy";

/**
 * Interface for EBS CSI Driver EKS add-on options
 */
interface EbsCsiDriverAddOnProps {
    /**
     * Version of the driver to deploy
     */
    version?: string;
    /**
     * List of KMS keys to be used for encryption
     */
    kmsKeys?: kms.Key[];
}

/**
 * Default values for the add-on
 */
const defaultProps = {
    addOnName: "aws-ebs-csi-driver",
    version: "v1.14.0-eksbuild.1",
    saName: "ebs-csi-controller-sa",
};

/**
 * Implementation of EBS CSI Driver EKS add-on
 */
export class EbsCsiDriverAddOn extends CoreAddOn {

    constructor(readonly options?: EbsCsiDriverAddOnProps) {
        super({
            addOnName: defaultProps.addOnName,
            version: options?.version ?? defaultProps.version,
            saName: defaultProps.saName
        });
    }

    providePolicyDocument(clusterInfo: ClusterInfo) : PolicyDocument {
        return getEbsDriverPolicyDocument(clusterInfo.cluster.stack.partition, this.options?.kmsKeys);
    }
}


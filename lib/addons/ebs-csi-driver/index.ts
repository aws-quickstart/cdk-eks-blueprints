import { PolicyDocument } from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { ClusterInfo } from "../../spi";
import { CoreAddOn } from "../core-addon";
import { getEbsDriverPolicyDocument } from "./iam-policy";
import { supportsALL } from "../../utils";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_28, "v1.26.1-eksbuild.1"],
    [KubernetesVersion.V1_27, "v1.26.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.26.1-eksbuild.1"]
]);

/**
 * Interface for EBS CSI Driver EKS add-on options
 */
export interface EbsCsiDriverAddOnProps {
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
    version: "auto",
    versionMap: versionMap,
    saName: "ebs-csi-controller-sa",
};

/**
 * Implementation of EBS CSI Driver EKS add-on
 */
@supportsALL
export class EbsCsiDriverAddOn extends CoreAddOn {

    constructor(readonly options?: EbsCsiDriverAddOnProps) {
        super({
            addOnName: defaultProps.addOnName,
            version: options?.version ?? defaultProps.version,
            saName: defaultProps.saName,
            versionMap: defaultProps.versionMap,
        });
    }

    providePolicyDocument(clusterInfo: ClusterInfo) : PolicyDocument {
        return getEbsDriverPolicyDocument(clusterInfo.cluster.stack.partition, this.options?.kmsKeys);
    }
}


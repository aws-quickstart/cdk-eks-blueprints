import { CfnAddon } from "@aws-cdk/aws-eks";
import {ClusterAddOn} from "../..";
import { ClusterInfo } from "../../spi";
import {AmazonEksEbsCsiDriverPolicy} from "./iam-policy";
import * as iam from "@aws-cdk/aws-iam";

/**
 * User provided overrides for the add-on
 */
export class EbsCsiDriveAddOnProps {
    /**
     * Version of the Helm chart to be installed
     */
    readonly version?: string;
}

/**
 * Default values for the add-on
 */
const DEFAULT_PROPS = {
    addOnName: 'aws-ebs-csi-driver',
    namespace: 'kube-system',
    version: 'v1.4.0-eksbuild.preview'
};

/**
 * Implementation of EBS CSI Driver EKS add-on.
 */
export class EbsCsiDriverAddOn implements ClusterAddOn {

    readonly options: EbsCsiDriveAddOnProps;

    constructor(ebsCsiDriveAddOnProps: EbsCsiDriveAddOnProps) {
        this.options = ebsCsiDriveAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;

        // Permissions

        const serviceAccount = cluster.addServiceAccount(DEFAULT_PROPS.addOnName, {
            name: DEFAULT_PROPS.addOnName,
            namespace: DEFAULT_PROPS.namespace,
        });

        AmazonEksEbsCsiDriverPolicy.Statement.forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        // Add-on

        new CfnAddon(cluster.stack,  DEFAULT_PROPS.addOnName + "-addOn", {
            addonName: DEFAULT_PROPS.addOnName,
            addonVersion: this.options.version ?? DEFAULT_PROPS.version,
            clusterName: cluster.clusterName,
            serviceAccountRoleArn: serviceAccount.role.roleArn,
            resolveConflicts: "OVERWRITE"
        });

    }
}
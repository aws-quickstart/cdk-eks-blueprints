import { CfnAddon } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";
import { PolicyDocument } from "aws-cdk-lib/aws-iam";
import { createServiceAccount } from "../../utils";

export class CoreAddOnProps {
    /**
     * Name of the add-on to instantiate
     */
    readonly addOnName: string;
    /**
     * Version of the add-on to use. Must match the version of the cluster where it
     * will be deployed it
     */
    readonly version: string;
    /**
     * Policy document provider returns the policy required by the add-on to allow it to interact with AWS resources
     */
    readonly policyDocumentProvider?: (partition: string) => PolicyDocument;
}

const DEFAULT_NAMESPACE = "kube-system";

/**
 * Implementation of EKS Managed add-ons.
 */
export class CoreAddOn implements ClusterAddOn {

    readonly coreAddOnProps: CoreAddOnProps;

    constructor(coreAddOnProps: CoreAddOnProps) {
        this.coreAddOnProps = coreAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): void {

        // Create a service account if user provides namespace and service account
        let serviceAccountRoleArn: string | undefined = undefined;

        if (this.coreAddOnProps?.policyDocumentProvider) {
            const policyDoc = this.coreAddOnProps.policyDocumentProvider(clusterInfo.cluster.stack.partition);
            const serviceAccount = createServiceAccount(clusterInfo.cluster, this.coreAddOnProps.addOnName,
                DEFAULT_NAMESPACE, policyDoc);
            serviceAccountRoleArn = serviceAccount.role.roleArn;
        }


        // Instantiate the Add-on
        new CfnAddon(clusterInfo.cluster.stack, this.coreAddOnProps.addOnName + "-addOn", {
            addonName: this.coreAddOnProps.addOnName,
            addonVersion: this.coreAddOnProps.version,
            clusterName: clusterInfo.cluster.clusterName,
            serviceAccountRoleArn: serviceAccountRoleArn,
            resolveConflicts: "OVERWRITE"
        });
    }
}
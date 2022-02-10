import { CfnAddon } from "@aws-cdk/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";
import { PolicyDocument } from "@aws-cdk/aws-iam";
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
     * Policy document required by the add-on to allow it to interact with AWS resources
     */
    readonly policyDocument?: PolicyDocument;
    /**
     * Namespace in which to create the service account associated with the policy document
     * If not specified, defaults to 'kube-system'.
     * Ignored if the policy document is not provided
     */
    readonly namespace?: string;
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
        let namespace: string = this.coreAddOnProps?.namespace ? this.coreAddOnProps.namespace : DEFAULT_NAMESPACE;

        if (this.coreAddOnProps?.policyDocument) {
            const serviceAccount = createServiceAccount(clusterInfo.cluster, this.coreAddOnProps.addOnName,
                namespace, this.coreAddOnProps.policyDocument);
            serviceAccountRoleArn = serviceAccount?.role?.roleArn;
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
import { CfnAddon, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo } from "../../spi";
import { Construct } from "constructs";
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
    /**
     * Service Account Name to be used with AddOn.
     */
    readonly saName: string;
    /**
     * Namespace to create the ServiceAccount.
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

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        
        let serviceAccountRoleArn: string | undefined = undefined;
        let serviceAccount: ServiceAccount | undefined = undefined;
        let saNamespace: string | undefined = undefined;

        saNamespace = DEFAULT_NAMESPACE;
        if (this.coreAddOnProps?.namespace) {
            saNamespace = this.coreAddOnProps.namespace;
        }

        // Create a service account if user provides namespace, PolicyDocument
        const policyDoc = this.providePolicyDocument(clusterInfo);
        if (policyDoc) {
            serviceAccount  = createServiceAccount(clusterInfo.cluster, this.coreAddOnProps.saName,
                saNamespace, policyDoc);
            serviceAccountRoleArn = serviceAccount.role.roleArn;
        }

        let addOnProps = {
            addonName: this.coreAddOnProps.addOnName,
            addonVersion: this.coreAddOnProps.version,
            clusterName: clusterInfo.cluster.clusterName,
            serviceAccountRoleArn: serviceAccountRoleArn,
            resolveConflicts: "OVERWRITE"
        };

        const cfnAddon = new CfnAddon(clusterInfo.cluster.stack, this.coreAddOnProps.addOnName + "-addOn", addOnProps);
        if (serviceAccount) {
            cfnAddon.node.addDependency(serviceAccount);
        }
        // Instantiate the Add-on
        return Promise.resolve(cfnAddon);
    }

    providePolicyDocument(clusterInfo: ClusterInfo) : PolicyDocument | undefined {
        if(this.coreAddOnProps?.policyDocumentProvider) {
            return this.coreAddOnProps.policyDocumentProvider(clusterInfo.cluster.stack.partition);
        }
        return undefined;
    }
}
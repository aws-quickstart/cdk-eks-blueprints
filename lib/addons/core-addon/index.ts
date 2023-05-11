import { CfnAddon, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo, Values } from "../../spi";
import { Construct } from "constructs";
import { IManagedPolicy, ManagedPolicy, PolicyDocument } from "aws-cdk-lib/aws-iam";
import { createServiceAccountWithPolicy, deployBeforeCapacity, userLog,  } from "../../utils";

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
    /**
     * ConfigurationValues field to pass custom configurations to Addon
     */
    readonly configurationValues?: Values;

    /**
     * Indicates that add-on must be installed before any capacity is added for worker nodes (incuding Fargate).
     */
    readonly controlPlaneAddOn?: boolean;
}

const DEFAULT_NAMESPACE = "kube-system";

/**
 * Implementation of EKS Managed add-ons.
 */
export class CoreAddOn implements ClusterAddOn {

    readonly coreAddOnProps: CoreAddOnProps;

    constructor(coreAddOnProps: CoreAddOnProps) {
        this.coreAddOnProps = coreAddOnProps;
        userLog.debug(`Core add-on ${coreAddOnProps.addOnName} is at version ${coreAddOnProps.version}`);
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
        const policies = this.provideManagedPolicies(clusterInfo);
        if (policies) {
            serviceAccount = this.createServiceAccount(clusterInfo, saNamespace, policies);
            serviceAccountRoleArn = serviceAccount.role.roleArn;
        }

        let addOnProps = {
            addonName: this.coreAddOnProps.addOnName,
            addonVersion: this.coreAddOnProps.version,
            configurationValues: JSON.stringify(this.coreAddOnProps.configurationValues),
            clusterName: clusterInfo.cluster.clusterName,
            serviceAccountRoleArn: serviceAccountRoleArn,
            resolveConflicts: "OVERWRITE"
        };

        const cfnAddon = new CfnAddon(clusterInfo.cluster.stack, this.coreAddOnProps.addOnName + "-addOn", addOnProps);
        if (serviceAccount) {
            cfnAddon.node.addDependency(serviceAccount);
        }

        if(this.coreAddOnProps.controlPlaneAddOn) {
            deployBeforeCapacity(cfnAddon, clusterInfo);
        }
        // Instantiate the Add-on
        return Promise.resolve(cfnAddon);
    }

    createServiceAccount(clusterInfo: ClusterInfo, saNamespace: string, policies: IManagedPolicy[]): ServiceAccount {
        return createServiceAccountWithPolicy(clusterInfo.cluster, this.coreAddOnProps.saName,
            saNamespace, ...policies);
    }

    /**
     * Template method with default implementation to execute the supplied function of policyDocumentProvider.
     * Allows overriding this method in subclasses for more complex cases of policies.
     * @param clusterInfo 
     * @returns 
     */
    providePolicyDocument(clusterInfo: ClusterInfo) : PolicyDocument | undefined {
        if(this.coreAddOnProps?.policyDocumentProvider) {
            return this.coreAddOnProps.policyDocumentProvider(clusterInfo.cluster.stack.partition);
        }
        return undefined;
    }

    /**
     * Template method to return managed policies for the service account. 
     * Allows overriding in subclasses to handle more complex cases of policies.
     */
    provideManagedPolicies(clusterInfo: ClusterInfo) : IManagedPolicy[] | undefined {
        let result : IManagedPolicy[] | undefined;
        const policyDocument = this.providePolicyDocument(clusterInfo);
        
        if(policyDocument) {
            const policy = new ManagedPolicy(clusterInfo.cluster, `${this.coreAddOnProps.addOnName}-managed-policy`, {
                document: policyDocument
            });
            result = [policy];
        }
        return result;
    }

}
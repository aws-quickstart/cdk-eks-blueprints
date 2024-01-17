import { CfnAddon, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { ClusterAddOn } from "../..";
import { ClusterInfo, Values } from "../../spi";
import { Construct } from "constructs";
import { IManagedPolicy, ManagedPolicy, PolicyDocument } from "aws-cdk-lib/aws-iam";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { createServiceAccountWithPolicy, deployBeforeCapacity, logger, userLog,  } from "../../utils";
import * as sdk from "@aws-sdk/client-eks";
import { RemovalPolicy } from "aws-cdk-lib";

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


    /**
     * Map between kubernetes versions and addOn versions for auto selection.
     */
    readonly versionMap?: Map<KubernetesVersion, string>;
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

    async deploy(clusterInfo: ClusterInfo): Promise<Construct> {

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
        let version: string = this.coreAddOnProps.version;

        if (this.coreAddOnProps.version === "auto") {
            version = await this.provideVersion(clusterInfo, this.coreAddOnProps.versionMap);
        }

        let addOnProps = {
            addonName: this.coreAddOnProps.addOnName,
            addonVersion: version,
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
        /**
         *  Retain the addon otherwise cluster destroy will fail due to CoreDnsComputeTypePatch 
         *  https://github.com/aws/aws-cdk/issues/28621
         * */ 
        
        if(clusterInfo.cluster instanceof FargateCluster && this.coreAddOnProps.addOnName === "coredns"){
            cfnAddon.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE)
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

    async provideVersion(clusterInfo: ClusterInfo, versionMap?: Map<KubernetesVersion, string>) : Promise<string> {
        const client = new sdk.EKSClient(clusterInfo.cluster.stack.region);
        const command = new sdk.DescribeAddonVersionsCommand({
            addonName: this.coreAddOnProps.addOnName,
            kubernetesVersion: clusterInfo.version.version
        });

        try {
            const response = await client.send(command);
            if (response.addons && response.addons.length > 0)
            {
                const defaultVersions = response.addons?.flatMap(addon =>
                    addon.addonVersions?.filter(version =>
                      version.compatibilities?.some(compatibility => compatibility.defaultVersion === true)
                    )
                );

                const version: string | undefined = defaultVersions[0]?.addonVersion;
                if (!version) { 
                    throw new Error(`No default version found for addo-on ${this.coreAddOnProps.addOnName}`);
                }
                userLog.debug(`Core add-on ${this.coreAddOnProps.addOnName} has autoselected version ${version}`);
                return version;
            }
            else {
                throw new Error(`No add-on versions found for addon-on ${this.coreAddOnProps.addOnName}`);
            }
        }
        catch (error) {
            logger.warn(error);
            logger.warn(`Failed to retrieve add-on versions from EKS for add-on ${this.coreAddOnProps.addOnName}. Falling back to default version.`);
            if (!versionMap) {
                throw new Error(`No version map provided and no default version found for add-on ${this.coreAddOnProps.addOnName}`);
            }
            let version: string = versionMap.get(clusterInfo.version) ?? versionMap.values().next().value;
            userLog.debug(`Core add-on ${this.coreAddOnProps.addOnName} has autoselected version ${version}`);
            return version;
        }
    }
}

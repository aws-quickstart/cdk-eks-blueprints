import { ICluster, ServiceAccount } from "aws-cdk-lib/aws-eks-v2";
import * as eks from "aws-cdk-lib/aws-eks-v2";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Creates a service account that can access secrets
 * @param clusterInfo 
 * @returns sa
 */
export function createServiceAccount(cluster: ICluster, name: string, namespace: string, policyDocument: iam.PolicyDocument, type?: eks.IdentityType): ServiceAccount {
    const policy = new iam.ManagedPolicy(cluster, `${name}-managed-policy`, {
        document: policyDocument
    });

    return createServiceAccountWithPolicy(cluster, name, namespace, type, policy);

}

export function createServiceAccountWithPolicy(cluster: ICluster, name: string, namespace: string, type?: eks.IdentityType, ...policies: iam.IManagedPolicy[]): ServiceAccount {
    const sa = cluster.addServiceAccount(`${name}-sa`, {
        name: name,
        namespace: namespace,
        identityType: type
    });

    policies.forEach(policy => sa.role.addManagedPolicy(policy));
    return sa;
}

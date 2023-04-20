import { Cluster, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { IManagedPolicy, ManagedPolicy, PolicyDocument } from "aws-cdk-lib/aws-iam";

/**
 * Creates a service account that can access secrets
 * @param clusterInfo 
 * @returns sa
 */
export function createServiceAccount(cluster: Cluster, name: string, namespace: string, policyDocument: PolicyDocument): ServiceAccount {
    const policy = new ManagedPolicy(cluster, `${name}-managed-policy`, {
        document: policyDocument
    });

    return createServiceAccountWithPolicy(cluster, name, namespace, policy);

}

export function createServiceAccountWithPolicy(cluster: Cluster, name: string, namespace: string, ...policies: IManagedPolicy[]): ServiceAccount {
    const sa = cluster.addServiceAccount(`${name}-sa`, {
        name: name,
        namespace: namespace
    });

    policies.forEach(policy => sa.role.addManagedPolicy(policy));
    return sa;
}

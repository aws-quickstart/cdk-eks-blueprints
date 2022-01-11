import { Cluster, ServiceAccount } from "@aws-cdk/aws-eks";
import { PolicyDocument, ManagedPolicy } from "@aws-cdk/aws-iam";

/**
 * Creates a service account that can access secrets
 * @param clusterInfo 
 * @returns sa
 */
export function createServiceAccount(cluster: Cluster, name: string, namespace: string, policyDocument: PolicyDocument): ServiceAccount {
    const sa = cluster.addServiceAccount(`${name}-sa`, {
        name: name,
        namespace: namespace,
    });

    const policy = new ManagedPolicy(cluster, `${name}-managed-policy`, {
        document: policyDocument
    });

    sa.role.addManagedPolicy(policy)
    
    return sa
}

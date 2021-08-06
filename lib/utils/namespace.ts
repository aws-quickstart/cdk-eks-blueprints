import { Cluster, KubernetesManifest } from '@aws-cdk/aws-eks';

/**
 * Creates namespace, which is a prerequisite for service account creation and subsequent chart execution.
 * @param clusterInfo 
 * @returns 
*/
export const createNamespace = (cluster: Cluster, namespace: string): KubernetesManifest => {
    const id = `${namespace}-id`
    const stack = cluster.stack
    return new KubernetesManifest(stack, id, {
        cluster,
        manifest: [{
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: namespace,
            }
        }],
        overwrite: true,
        prune: true
    });
}
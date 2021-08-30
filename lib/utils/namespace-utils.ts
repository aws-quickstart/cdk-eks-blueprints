import * as eks from "@aws-cdk/aws-eks";

export function createNamespace(name: string, cluster: eks.Cluster) {
    return cluster.addManifest(name, {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name }
    });
}
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import * as eks from "aws-cdk-lib/aws-eks";
import { Values } from "../spi";
import { Stack } from "aws-cdk-lib";

/**
  * Creates namespace if it does not already exist in the clusters tree
  * (if creating multiple AddOns in the same tree, it will not try and create a new namespace if it already exist)
  * (a prerequisite for serviceaccount and helm chart execution for many add-ons).
  * @param name
  * @param cluster
  * @param overwrite
  * @param prune 
  * @returns KubernetesManifest
  */
export function createNamespace(name: string, cluster: eks.ICluster, overwrite?: boolean, prune?: boolean, annotations?: Values, labels? : Values) {
    const namespaceId = `${name}-namespace-struct`;
    const existingManifest = Stack.of(cluster).node.tryFindChild(namespaceId) as KubernetesManifest;
    if (existingManifest){
        return existingManifest;
    }
    return new KubernetesManifest(cluster.stack, namespaceId, {
        cluster: cluster,
        manifest: [{
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: name,
                annotations,
                labels
            }
        }],
        overwrite: overwrite ?? true,
        prune: prune ?? true
    });
}
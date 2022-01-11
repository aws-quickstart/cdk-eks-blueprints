import { KubernetesManifest } from "@aws-cdk/aws-eks";
import * as eks from "@aws-cdk/aws-eks";

/**
  * Creates namespace
  * (a prerequisite for serviceaccount and helm chart execution for many add-ons).
  * @param name
  * @param cluster
  * @param overwrite
  * @param prune 
  * @returns KubernetesManifest
  */
export function createNamespace(name: string, cluster: eks.Cluster, overwrite?: boolean, prune?: boolean) {
    return new KubernetesManifest(cluster.stack, `${name}-namespace-struct`, {
        cluster: cluster,
        manifest: [{
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: name,
            }
        }],
        overwrite: overwrite ?? true,
        prune: prune ?? true
    });
}
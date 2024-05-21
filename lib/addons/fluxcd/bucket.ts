import { setPath } from "../../utils";

/**
 * Flux Bucket API defines a Source to produce an Artifact for objects from storage solutions like Amazon S3.
 * @see https://fluxcd.io/flux/components/source/buckets/
 */
export class FluxBucket {

    constructor(private readonly bucketName: string, private readonly region: string, private readonly bucketPrefix?: string) {}

    public generate(name: string, namespace: string, fluxSyncInterval: string, provider: string, endpoint: string, fluxSecretRefName?: string) {

        const bucketManifest =  {
            apiVersion: "source.toolkit.fluxcd.io/v1beta2",
            kind: "Bucket",
            metadata: {
                name: name,
                namespace: namespace
            },
            spec: {
                interval: fluxSyncInterval,
                bucketName: this.bucketName,
                provider: provider,
                endpoint: endpoint,
                region: this.region,
            }
        };

        if (fluxSecretRefName) {
            setPath(bucketManifest, "spec.secretRef.name", fluxSecretRefName);
        }

        if (this.bucketPrefix) {
            setPath(bucketManifest, "spec.prefix", this.bucketPrefix);
        }

        return bucketManifest;
    }
}

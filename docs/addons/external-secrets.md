# External Secrets Add-On

External Secrets add-on is based on [External Secrets Operator (ESO)](https://github.com/external-secrets/external-secrets) and allows integration with third-party secret stores like AWS Secrets Manager, AWS Systems Manager Parameter Store and inject the values into the EKS cluster as Kubernetes Secrets.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.ExternalsSecretsAddOn({});

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(addOn)
    .build(app, 'my-stack-name');
```

## Cluster Secret Store

Create a [ClusterSecretStore](https://external-secrets.io/v0.5.9/api-clustersecretstore/) which can be used by all
ExternalSecrets from all namespaces.

Below example is for integration with AWS Secrets Manager:

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

const cluster = blueprint.getClusterInfo().cluster;

const clusterSecretStore = new eks.KubernetesManifest(scope, "ClusterSecretStore", {
    cluster: cluster,
    manifest: [
        {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ClusterSecretStore",
            metadata: {name: "default"},
            spec: {
                provider: {
                    aws: {
                        service: "SecretsManager",
                        region: region,
                        auth: {
                            jwt: {
                                serviceAccountRef: {
                                    name: "external-secrets-sa",
                                    namespace: "external-secrets",
                                },
                            },
                        },
                    },
                },
            },
        },
    ],
});
```

Below example is for integration with AWS Systems Manager Parameter Store:

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

const cluster = blueprint.getClusterInfo().cluster;

const clusterSecretStore = new eks.KubernetesManifest(scope, "ClusterSecretStore", {
    cluster: cluster,
    manifest: [
        {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ClusterSecretStore",
            metadata: {name: "default"},
            spec: {
                provider: {
                    aws: {
                        service: "ParameterStore",
                        region: region,
                        auth: {
                            jwt: {
                                serviceAccountRef: {
                                    name: "external-secrets-sa",
                                    namespace: "external-secrets",
                                },
                            },
                        },
                    },
                },
            },
        },
    ],
});
```

## External Secret

Create an [ExternalSecret](https://external-secrets.io/v0.5.9/api-externalsecret/) which can be used to fetch, transform
and inject secret data

```typescript
import * as eks from 'aws-cdk-lib/aws-eks';

const cluster = blueprint.getClusterInfo().cluster;
const keyfiles = new eks.KubernetesManifest(scope, "ExternalSecret", {
    cluster: cluster,
    manifest: [
        {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {name: "the-external-secret-name"},
            spec: {
                secretStoreRef: {
                    name: "default",
                    kind: "ClusterSecretStore",
                },
                target: {
                    name: "the-kubernetes-secret-name",
                    creationPolicy: "Merge",
                },
                data: [
                    {
                        secretKey: "secret-key-to-be-managed",
                        remoteRef: {
                            key: "the-providers-secret-name",
                            property: "the-provider-secret-property",
                        },
                    },
                ],
            },
        },
    ],
});
```

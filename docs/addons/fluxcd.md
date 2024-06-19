# FluxCD Add-on

This add-on installs [fluxcd](https://fluxcd.io/).

Flux is a declarative, GitOps-based continuous delivery tool that can be integrated into any CI/CD pipeline. The ability to manage deployments to multiple remote Kubernetes clusters from a central management cluster, support for progressive delivery, and multi-tenancy are some of the notable features of Flux.

## Usage

### Single bootstrap repo path

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.FluxCDAddOn({
    repositories:[{
         name: "aws-observability-accelerator",
         namespace: undefined,
         repository: {
             repoUrl: 'https://github.com/aws-observability/aws-observability-accelerator',
             targetRevision: "main",
         },
         values: {
             "region": "us-east-2"
         },
         kustomizations: [{kustomizationPath: "./artifacts/grafana-operator-manifests/eks/infrastructure"}],
    }],
})
...

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

### Multiple bootstrap repo paths

Multiple bootstrap repo paths are useful when you want to create multiple Kustomizations, pointing to different paths, e.g. to deploy manifests from specific subfolders in your repository:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.FluxCDAddOn({
    repositories: [{
        name: "aws-observability-accelerator",
        namespace: undefined,
        repository: {
            repoUrl: 'https://github.com/aws-observability/aws-observability-accelerator',
            targetRevision: "main",
        },
        values: {
            "region": "us-east-2"
        },
        kustomizations: [{kustomizationPath:"./artifacts/grafana-operator-manifests/eks/infrastructure"}, {kustomizationPath: "./artifacts/grafana-operator-manifests/eks/java"}]
    }],
})
...

const blueprint = blueprints.EksBlueprint.builder()
    .version("auto")
    .addOns(addOn)
    .build(app, 'my-stack-name');
```

## Workload Repositories

1. To add workload repositories as well as the bootstrap repository, please follow this example below 

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const nginxDashUrl = "https://raw.githubusercontent.com/aws-observability/aws-observability-accelerator/main/artifacts/grafana-dashboards/eks/nginx/nginx.json"
const javaDashUrl = "https://raw.githubusercontent.com/aws-observability/aws-observability-accelerator/main/artifacts/grafana-dashboards/eks/java/default.json"

const addOn = new blueprints.addons.FluxCDAddOn({
    repositories: [
        {
            name: "aws-observability-accelerator",
            namespace: undefined,
            repository: {
                repoUrl: 'https://github.com/aws-observability/aws-observability-accelerator',
                targetRevision: "main",
            },
            values: {
                "GRAFANA_NGINX_DASH_URL" : nginxDashUrl,
                "GRAFANA_JAVA_JMX_DASH_URL": javaDashUrl,
            },
            kustomizations: [{kustomizationPath:"./artifacts/grafana-operator-manifests/eks/infrastructure"}, {kustomizationPath: "./artifacts/grafana-operator-manifests/eks/java"}]
        },
        {
            name: "podinfo",
            namespace: undefined,
            repository: {
                repoUrl: 'https://github.com/stefanprodan/podinfo',
                targetRevision: "master",
            },
            values: {
                "region": "us-east-2"
            },
            kustomizations: [{kustomizationPath: "./kustomize", kustomizationTargetNamespace: "default"}],
        }
    ],
});

const blueprint = blueprints.EksBlueprint.builder()
    .version("auto")
    .addOns(
        new blueprints.addons.GrafanaOperatorAddon,
        addOn,
    )
    .build(app, 'my-stack-name');
```


## Secret Management for private Git repositories with FluxCD

Please follow the below steps if you are looking to setup FluxCD addon to read secrets and sync private Git repos.

*Note that different git servers may require different authentication methods. For example, GitHub requires a basic access token, while others may require a bearer token. For more information, refer to the [FluxCD documentation](https://fluxcd.io/flux/components/source/gitrepositories/#secret-reference).*

1. Please use the following CLI command to create an AWS Secrets Manager secret for `basic-access-auth`.

```bash
export SECRET_NAME=basic-access-auth
export GIT_USERNAME=<YOUR_GIT_USERNAME>
export GIT_TOKEN=<YOUR_GIT_TOKEN>
export AWS_REGION=<YOUR_AWS_REGION>
aws secretsmanager create-secret \
  --name $SECRET_NAME \
  --description "Your GIT BASIC ACCESS SECRET" \
  --secret-string "{ 'username': '${GIT_USERNAME}', 'password': '${GIT_TOKEN}' }" \
  --region $AWS_REGION
```

2. Below is the snippet showing the usage of adding `ExternalsSecretsAddOn` to read secrets from AWS Secrets Manager and configuring `FluxCDAddOn` to read private repositories.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { ExternalOperatorSecretAddon } from './externaloperatorsecretaddon';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.ExternalsSecretsAddOn(),
  new blueprints.addons.FluxCDAddOn({
    repositories:[
      {
        name: "<<YOUR_FLUX_APP_NAME>>",
        namespace: "<<YOUR_FLUX_ADDON_NAMESPACE>>",
        repository: {
            repoUrl: '<<YOUR_PRIVATE_GIT_REPOSITORY>>',
            targetRevision: "<<YOUR_TARGET_REVISION>>",
        },
        values: {
            "region": "us-east-1"
        },
        kustomizations: [{kustomizationPath: "<<YOUR_FLUX_SYNC_PATH>>"}],
        // This is the name of the kubernetes secret to be created by `ExternalSecret` shown in step 3.
        secretRefName: "repository-creds" 
      }
    ],

  }),
  new ExternalOperatorSecretAddon(),
];


const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOns)
  .build(app, 'my-stack-name');
```

3. Below is the code snippet `externaloperatorsecretaddon.ts` which shows the mechanism to setup `ClusterSecretStore` and `ExternalSecret` to read AWS Secrets Manager `basic-access-auth` secret which is a GIT basic access authentication username and password to sync private repositories :

```typescript
import 'source-map-support/register';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from 'constructs';
import { dependable } from '@aws-quickstart/eks-blueprints/dist/utils';

export class ExternalOperatorSecretAddon implements blueprints.ClusterAddOn {
    id?: string | undefined;
    @dependable(blueprints.addons.ExternalsSecretsAddOn.name)
    deploy(clusterInfo: blueprints.ClusterInfo): void | Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const secretStore = new eks.KubernetesManifest(clusterInfo.cluster.stack, "ClusterSecretStore", {
            cluster: cluster,
            manifest: [
                {
                    apiVersion: "external-secrets.io/v1beta1",
                    kind: "ClusterSecretStore",
                    metadata: {
                        name: "secret-manager-store",
                        namespace: "default"
                    },
                    spec: {
                        provider: {
                            aws: {
                                service: "SecretsManager",
                                region: clusterInfo.cluster.stack.region,
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
        
        const externalSecret = new eks.KubernetesManifest(clusterInfo.cluster.stack, "ExternalSecret", {
            cluster: cluster,
            manifest: [
                {
                    apiVersion: "external-secrets.io/v1beta1",
                    kind: "ExternalSecret",
                    metadata: {
                        name: "git-admin-credentials",
                        namespace: "flux-system"
                    },
                    spec: {
                        secretStoreRef: {
                            name: "secret-manager-store",
                            kind: "ClusterSecretStore",
                        },
                        target: {
                            name: "repository-creds"
                        },
                        dataFrom: [
                            {
                                extract: {
                                    key: "basic-access-auth"
                                },
                            },
                        ],
                    },
                },
            ],
        });
        externalSecret.node.addDependency(secretStore);
        return Promise.resolve(secretStore);
    }
}
```

4. Upon execution of the above blueprint, the above `ExternalSecret` Kubernetes resource will take care of creating a Kubernetes Secret as shown below in `flux-system` namespace :

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repository-creds
  namespace: flux-system
type: Opaque
data:
  username: <<BASE64 ENCODED SECRET OF YOUR_GIT_USERNAME STORE in AWS SECRETS MANAGER>>
  password: <<BASE64 ENCODED SECRET OF YOUR_GIT_TOKEN STORE in AWS SECRETS MANAGER>>
```

As pointed, if you are looking to use `secretRef` to reference a secret for FluxCD addon to sync private Git repos, please make sure the referenced secret is already created in the namespace ahead of time in AWS Secrets Manager as shown above. You can use [External Secrets Addon](./external-secrets.md) to learn more about external secrets operator which allows integration with third-party secret stores like AWS Secrets Manager, AWS Systems Manager Parameter Store and inject the values into the EKS cluster as Kubernetes Secrets.

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you.
- `values`: Arbitrary values to pass to the chart. Refer to the FluxCD [Helm Chart documentation](https://artifacthub.io/packages/helm/fluxcd-community/flux2) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that fluxcd is installed properly in the cluster, check if the namespace is created and fluxcd pods are running.

Verify if the namespace is created correctly

```bash
  kubectl get ns | grep "flux-system"
```

There should be list the flux-system namespace

```bash
flux-system      Active   31m
```

Verify if the pods are running correctly in flux-system namespace

```bash
  kubectl get pods -n flux-system  
```

There should list 3 pods starting with name flux-system
For Eg:

```bash
NAME                                          READY   STATUS    RESTARTS   AGE
helm-controller-65cc46469f-v4hnr              1/1     Running   0          6m13s
image-automation-controller-d8f7bfcb4-v4pz8   1/1     Running   0          6m13s
image-reflector-controller-68979dfd49-t4dpj   1/1     Running   0          6m13s
kustomize-controller-767677f7f5-7j26b         1/1     Running   0          6m13s
notification-controller-55d8c759f5-zqd6f      1/1     Running   0          6m13s
source-controller-58c66d55cd-4f6vh            1/1     Running   0          6m13s
```

## Testing

The Flux CLI is available as a binary executable for all major platforms, the binaries can be downloaded form GitHub releases page.

Install Fluxcd client
```bash
curl -s https://fluxcd.io/install.sh | sudo bash
. <(flux completion bash)
```

Run the below command to check on the `GitRepository` setup with Flux :

```bash
kubectl get gitrepository -A
NAME      URL                                       AGE   READY   STATUS                                                                        
podinfo   https://github.com/stefanprodan/podinfo   5s    True    stored artifact for revision 'master@sha1:132f4e719209eb10b9485302f8593fc0e680f4fc'
```

Run the below command to check on the `Kustomization` setup with Flux :

```bash
❯ kubectl get kustomizations.kustomize.toolkit.fluxcd.io -A
NAMESPACE     NAME      AGE   READY   STATUS
flux-system   podinfo   12m   True    Applied revision: master@sha1:073f1ec5aff930bd3411d33534e91cbe23302324
```


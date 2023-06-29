# FluxCD Add-on

This add-on installs [fluxcd](https://fluxcd.io/).

Flux is a declarative, GitOps-based continuous delivery tool that can be integrated into any CI/CD pipeline. The ability to manage deployments to multiple remote Kubernetes clusters from a central management cluster, support for progressive delivery, and multi-tenancy are some of the notable features of Flux.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.FluxCDAddOn({
    bootstrapRepo: {
        repoUrl: 'https://github.com/stefanprodan/podinfo',
        name: "podinfo",
        targetRevision: "master",
        path: "./kustomize"
    },
    bootstrapValues: {
        "region": "us-east-1"
    },
}),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Secret Management for private Git repositories

If you are looking to use `secretRef` to reference a secret for FluxCD addon to sync private Git repos, please make sure the referenced secret is already created in the namespace ahead of time. You can use [External Secrets Addon](./external-secrets.md) to install an external secrets operator which allows integration with third-party secret stores like AWS Secrets Manager, AWS Systems Manager Parameter Store and inject the values into the EKS cluster as Kubernetes Secrets.

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


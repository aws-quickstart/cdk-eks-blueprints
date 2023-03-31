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
        repoUrl: 'https://github.com/aws-samples/eks-blueprints-add-ons.git',
        name: "workloadsrepo",
        targetRevision: "eks-blueprints-cdk",
    },
}),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you.
- `values`: Arbitrary values to pass to the chart. Refer to the cert-manager [Helm Chart documentation](https://artifacthub.io/packages/helm/fluxcd-community/flux2) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

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

Verify if the `GitRepository` is created fine to bootstrap a git repo:
```bash
❯ kubectl get gitrepositories.source.toolkit.fluxcd.io -A
NAMESPACE     NAME            URL                                                         AGE   READY   STATUS
flux-system   workloadsrepo   https://github.com/aws-samples/eks-blueprints-add-ons.git   24m   True    stored artifact for revision 'eks-blueprints-cdk@sha1:65f1fbbb5165821f6f8bd14eba65a6d2f6cfe0fb'
```

## Testing

The Flux CLI is available as a binary executable for all major platforms, the binaries can be downloaded form GitHub releases page.

Install Fluxcd client
```bash
curl -s https://fluxcd.io/install.sh | sudo bash
. <(flux completion bash)
```
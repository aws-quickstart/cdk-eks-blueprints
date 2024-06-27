# Upbound Universal Crossplane (UXP) Amazon EKS Add-on

The `Upbound Universal Crossplane Amazon EKS Add-on` allows Amazon Elastic Kubernetes Service (Amazon EKS) clusters to manage the lifecycle of Crossplane distribution.

Upbound Universal Crossplane (UXP) is Upbound's official enterprise-grade Crossplane distribution. It's free, open source, and fully conformant with upstream Crossplane. UXP is hardened and tested by Upbound so customers can confidently deploy control plane architectures to production. Connect UXP to Upbound Cloud is enabled with a free Upbound account for simplified management.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addonsUpboundCrossplaneAddOn({
    clusterAccessRole: blueprints.getResource(context => {
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new iam.AccountRootPrincipal() });
    }),
});

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

iguration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you.
- `values`: Arbitrary values to pass to the chart. Refer to the FluxCD [Helm Chart documentation](https://artifacthub.io/packages/helm/fluxcd-community/flux2) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that Upbound Crossplane add-on is installed properly:
```bash
kubectl get all -n upbound-system

# Output
NAME                                        READY   STATUS    RESTARTS      AGE
pod/crossplane-776449cbc7-t9jnn             1/1     Running   0             25m
pod/upbound-bootstrapper-844f84fcf4-xgpj9   1/1     Running   0             25m
pod/xgql-55d7475b48-dlfgc                   1/1     Running   2 (25m ago)   25m

NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/upbound-agent   ClusterIP   172.20.131.84    <none>        6443/TCP   25m
service/xgql            ClusterIP   172.20.138.213   <none>        443/TCP    25m

NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/crossplane             1/1     1            1           25m
deployment.apps/upbound-bootstrapper   1/1     1            1           25m
deployment.apps/xgql                   1/1     1            1           25m

NAME                                              DESIRED   CURRENT   READY   AGE
replicaset.apps/crossplane-776449cbc7             1         1         1       25m
replicaset.apps/upbound-bootstrapper-844f84fcf4   1         1         1       25m
replicaset.apps/xgql-55d7475b48                   1         1         1       25m
```

## Functionality

Applies the Upbound Universal Crossplane add-on to an Amazon EKS cluster.

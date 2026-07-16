# Cluster Providers

The `eks-blueprints` framework allows customers to easily configure the underlying EKS clusters that it provisions. This is done via Cluster Providers. Customers can leverage the Cluster Providers that the framework supports, or supply their own. 

The framework currently provides support for the following Cluster Providers:

| Cluster Provider  | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`GenericClusterProvider`](./generic-cluster-provider.md) | Provisions an EKS cluster with one or more managed or Auto Scaling groups as well as Fargate Profiles.
| [`GenericClusterProviderV2`](./generic-cluster-provider-v2.md) | Provisions an EKS cluster with one or more managed node groups, Auto Scaling groups, Fargate Profiles, or uses EKS Auto Mode.
| [`AsgClusterProvider`](./asg-cluster-provider.md) | Provisions an EKS cluster with an Auto Scaling group used for compute capacity.
| [`MngClusterProvider`](./mng-cluster-provider.md) | Provisions an EKS cluster with a Managed Node group for compute capacity.
| [`FargateClusterProvider`](./fargate-cluster-provider.md) | Provisions an EKS cluster which leverages AWS Fargate to run Kubernetes pods.
| [`AutomodeClusterProvider`](./automode-cluster-provider.md) | Provisions an EKS cluster which uses EKS Auto Mode.
| [`ImportClusterProvider`](./import-cluster-provider.md) | Imports an existing EKS cluster into the blueprint allowing capabilities to add (certain) add-ons and teams.

By default, the framework will leverage the `MngClusterProvider` which creates a single managed node group.

If you would like to add more node groups to a single cluster, you can leverage `GenericClusterProvider`, which allows multiple managed node groups or autoscaling (self-managed) node groups along with Fargate profiles.

The version property that sets the Kubernetes Version for the Control Plane is required to be set either in the Cluster Provider, or in the Blueprint Properties.  In either spot, it can be set to a `KubernetesVersion` or `"auto"`.  If set to `auto`, the cluster version is set to the framework default (`DEFAULT_VERSION`) — the latest Kubernetes version validated by EKS Blueprints (not necessarily the newest version EKS offers). Relying on `auto` is not recommended for production clusters, as the default may advance across Blueprints releases; pin an explicit `KubernetesVersion` for deterministic upgrades.

## Customizing kubectl Layers

All cluster providers support customization of the kubectl layer used for cluster operations. This is particularly useful for security compliance or when specific kubectl versions are required.

To override the kubectl layer, extend any cluster provider and implement the `getKubectlLayer` method:

```typescript
import { KubectlV34Layer } from '@aws-cdk/lambda-layer-kubectl-v34';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import * as blueprints from '@aws-quickstart/eks-blueprints';

class CustomClusterProvider extends blueprints.AutomodeClusterProvider {
    protected getKubectlLayer(scope: Construct, version: KubernetesVersion): ILayerVersion {
        return new KubectlV34Layer(scope, "custom-kubectl-layer");
    }
}
```

This pattern works with all cluster provider types and enables:
- **Security compliance**: Use specific kubectl versions that meet security requirements
- **Version control**: Pin to tested kubectl versions for stability
- **Rapid patching**: Quickly adopt new kubectl layers when security patches are available

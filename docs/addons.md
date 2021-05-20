# Addons

## Supported Addons

| AddOn             | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| `AppMeshAddon`           | Adds an AppMesh controller and CRDs (pending validation on the latest version of CDK) |
| `ArgoCDAddon`            | Adds an ArgoCD controller |
| `CalicoAddon`            | Adds the Calico 1.7.1 CNI/Network policy engine |
| `CloudWatchAddon`        | Adds Container Insights support integrating monitoring with CloudWatch |
| [`ClusterAutoscalerAddon`](./docs/addons/cluster-autoscaler.md) | Adds the standard cluster autoscaler ([Karpenter](https://github.com/awslabs/karpenter) is coming)|
| `MetricsServerAddon`| Adds metrics server (pre-req for HPA and other monitoring tools)|
| `NginxAddon`        | Adds NGINX ingress controller |

## Creating an Addon
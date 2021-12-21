# Add-ons

The `ssp-amazon-eks` framework leverages a modular approach to managing [Add-ons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) that run within the context of a Kubernetes cluster. Customers are free to select the add-ons that run in each of their blueprint clusters.

Within the context of the `ssp-amazon-eks` framework, an add-on is abstracted as `ClusterAddOn` interface, and the implementation of the add-on interface can do whatever is necessary to support the desired add-on functionality. This can include applying manifests to a Kubernetes cluster or calling AWS APIs to provision new resources. 

## Supported Add-ons

The framework currently supports the following add-ons.

| Add-on             | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`AppMeshAddOn`](./app-mesh) | Adds an AppMesh controller and CRDs (pending validation on the latest version of CDK) |
| [`ArgoCDAddOn`](./argo-cd) | Provisions Argo CD into your cluster. |
| [`AWS Load Balancer Controller`](./aws-load-balancer-controller) | Provisions the AWS Load Balancer Controller into your cluster. |
| [`CalicoAddOn`](./calico) | Adds the Calico 1.7.1 CNI/Network policy engine |
| [`ClusterAutoscalerAddOn`](./cluster-autoscaler) | Adds the standard cluster autoscaler ([Karpenter](https://github.com/awslabs/karpenter) is coming)|
| [`ContainerInsightsAddOn`](./container-insights) | Adds Container Insights support integrating monitoring with CloudWatch |
| [`CoreDnsAddOn`](./coredns.md) | Adds CoreDNS Amazon EKS add-on. CoreDNS is a flexible, extensible DNS server that can serve as the Kubernetes cluster DNS |
| [`KubeProxyAddOn`](./kube-proxy.md) | Adds kube-proxy Amazon EKS add-on. Kube-proxy maintains network rules on each Amazon EC2 node |
| [`MetricsServerAddOn`](./metrics-server.md) | Adds metrics server (pre-req for HPA and other monitoring tools)|
| [`ExternalDnsAddOn`](./external-dns) | Adds [External DNS](https://github.com/kubernetes-sigs/external-dns) support for AWS to the cluster, integrating with Amazon Route 53
| [`MetricsServerAddOn`](./metrics-server) | Adds metrics server (pre-req for HPA and other monitoring tools)|
| [`NginxAddOn`](./nginx.md) | Adds NGINX ingress controller |
| [`SecretsStoreAddOn`](./secrets-store.md) |  Adds AWS Secrets Manager and Config Provider for Secret Store CSI Driver to the EKS Cluster |
| [`SSMAgentAddOn`](./ssm-agent.md) | Adds [Amazon SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) to worker nodes |
| [`VpcCniAddOn`](./vpc-cni.md) | Adds the Amazon VPC CNI Amazon EKS addon to support native VPC networking for Amazon EKS |
| [`Weave GitOps`](https://github.com/weaveworks/weave-gitops-ssp-addon) | [Weave GitOps Core](https://www.weave.works/product/gitops-core/) AddOn |
| [`XrayAddOn`](./xray) | Adds XRay Daemon to the EKS Cluster |
| [`VeleroAddOn`](./velero.md) | Adds [Velero](https://velero.io/) to the EKS Cluster |

# Standard Helm Add-On Configuration Options

Many add-ons leverage helm to provision and maintain deployments. All provided add-ons that leverage helm allow specifying the following add-on attributes:

```typescript
    /**
     * Name of the helm chart (add-on)
     */
    name?: string,

    /**
     * Namespace where helm release will be installed
     */
    namespace?: string,

    /**
     * Chart name
     */
    chart?: string,

    /**
     * Helm chart version.
     */
    version?: string, 

    /**
     * Helm release
     */
    release?: string,

    /**
     * Helm repository
     */
    repository?: string,

    /**
     * Optional values for the helm chart. 
     */
    values?: Values
```

Ability to set repository url may be leveraged for private repositories. 

Version field can be modified from the default chart version, e.g. if the add-on should be upgraded to the desired version, however, since the helm chart version supplied by the customer may not have been tested as part of the SSP release process, SSP community may not be able to reproduce/fix issues related to the helm chart version upgrade.
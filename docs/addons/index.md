# Add-ons

The `cdk-eks-blueprint` framework uses a modular approach to managing [add-ons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) that run within the context of a Kubernetes cluster. Customers can choose the add-ons that run in each blueprint clusters.

Within the context of the `cdk-eks-blueprint` framework, an add-in is an interface, and the implementation of an add-on can do what is necessary to support the desired add-on functionality. Examples of this include applying manifests to a Kubernetes cluster and calling AWS APIs to provision resources. 

## Supported Add-ons

The framework currently supports the following add-ons:

| Add-on             | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`AppMeshAddOn`](./app-mesh) | Adds AppMesh controller and CRDs (pending validation for the latest CDK version) |
| [`ArgoCDAddOn`](./argo-cd) | Provisions Argo CD into your cluster. |
| [`AWS Load Balancer Controller`](./aws-load-balancer-controller) | Provisions the AWS Load Balancer Controller into your cluster. |
| [`CalicoAddOn`](./calico) | Adds the Calico 1.7.1 CNI/network policy engine |
| [`ContainerInsightsAddOn`](./container-insights) | Adds Container Insights support to integrate Amazon CloudWatch monitoring |
| [`ClusterAutoscalerAddOn`](./cluster-autoscaler) | Adds standard cluster autoscaling ([Karpenter](https://github.com/awslabs/karpenter) is coming)|
| [`ExternalDnsAddOn`](./external-dns) | Adds [External DNS](https://github.com/kubernetes-sigs/external-dns) support for AWS to the cluster, integrating with Amazon Route 53
| [`MetricsServerAddOn`](./metrics-server) | Adds metrics server (a prerequisite for HPA and other monitoring tools)|
| [`NginxAddOn`](./nginx.md) | Adds NGINX inbound controller |
| [`SSMAgentAddOn`](./ssm-agent) | Adds [Amazon SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) to worker nodes | 
| [`Weave GitOps`](https://github.com/weaveworks/weave-gitops-ssp-addon) | [Weave GitOps Core](https://www.weave.works/product/gitops-core/) AddOn |
| [`XrayAddOn`](./xray) | Adds XRay daemon to the Amazon EKS Cluster |



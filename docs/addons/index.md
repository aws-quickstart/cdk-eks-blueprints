# Add-ons

The `cdk-eks-blueprint` framework leverages a modular approach to managing [add-ons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) that run within the context of a Kubernetes cluster. Customers are free to select the add-ons that run in each of their blueprint clusters.

Within the context of the `cdk-eks-blueprint` framework, an add-on is simply an class, and the implementation of an add-on can do whatever is necessary to support the desired add-on functionality. This can include applying manifests to a Kubernetes cluster or calling AWS APIs to provision new resources. 

## Supported AddOns

The framework currently supports the following add-ons.

| Add-on             | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`AppMeshAddOn`](./app-mesh) | Adds an AppMesh controller and CRDs (pending validation on the latest version of CDK) |
| [`ArgoCDAddOn`](./argo-cd) | Provisions Argo CD into your cluster. |
| [`AWS Load Balancer Controller`](./aws-load-balancer-controller) | Provisions the AWS Load Balancer Controller into your cluster. |
| [`CalicoAddOn`](./calico) | Adds the Calico 1.7.1 CNI/Network policy engine |
| [`ContainerInsightsAddOn`](./container-insights) | Adds Container Insights support integrating monitoring with CloudWatch |
| [`ClusterAutoscalerAddOn`](./cluster-autoscaler) | Adds the standard cluster autoscaler ([Karpenter](https://github.com/awslabs/karpenter) is coming)|
| [`MetricsServerAddOn`](./metrics-server.md) | Adds metrics server (pre-req for HPA and other monitoring tools)|
| `NginxAddOn` | Adds NGINX ingress controller |
| [`XrayAddOn`](./xray) | Adds XRay Daemon to the EKS Cluster |
| [`SSMAgentAddOn`](./ssm-agent.md) | Adds [Amazon SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) to worker nodes | 

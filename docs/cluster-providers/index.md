# Cluster Providers

The `ssp-amazon-eks` framework allows customers to easily configure the underlying EKS clusters that it provisions. This is done via Cluster Providers. Customers can leverage the Cluster Providers that the framework supports, or supply their own. 

The framework currently provides support for the following Cluster Providers:

| Cluster Provider  | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`AsgClusterProvider`](./asg-cluster-provider) | Provisions an EKS cluster with an Auto Scaling group used for compute capacity.
| [`MngClusterProvider`](./mng-cluster-provider) | Provisions an EKS cluster with a Managed Node group for compute capacity.
| [`FargateClusterProviders`](./fargate-cluster-provider) | Provisions an EKS cluster which leverages AWS Fargate to run Kubernetes pods.

By default, the framework will leverage the `MngClusterProvider`.
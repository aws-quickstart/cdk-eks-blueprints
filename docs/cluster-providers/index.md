# Cluster Providers

The `cdk-eks-blueprint` framework allows customers to easily configure the underlying EKS clusters that it provisions. This is done via `ClusterProviders`. Customers can leverage the ClusterProviders that the framework supports, or supply their own. 

The framework currently provides support for the following Cluster Providers:

| Cluster Provider  | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`AsgClusterProvider`](./asg-cluster-provider) | Provisions an EKS cluster with an Auto Scaling Group used for compute capacity.
| [`MngClusterProvider`](./mng-cluster-provider) | Provisions an EKS cluster with a Managed Node Group for compute capacity.
| [`FargateClusterProviders`](./fargate-cluster-provider) | Provisions an EKS cluster which leverage AWS Fargate to run Kubernetes pods.

By default, the framework will leverage the `MngClusterProvider`.
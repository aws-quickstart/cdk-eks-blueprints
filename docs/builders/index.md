# Builders

The `eks-blueprints` framework allows customers to use builders to configure required addons as they prepare a blueprint for setting EKS cluster with required day 2 operational tooling

The framework currently provides support for the following Builders:

| Builder  | Description                                                                       |
|-------------------|-----------------------------------------------------------------------------------|
| [`BedrockBuilder`](./bedrock-builder.md) | The `BedrockBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up an EKS cluster with access to Amazon Bedrock.
| [`GpuBuilder`](./gpu-builder.md) | The `GpuBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with GPU Operator to run your GPU workloads.
| [`GravitonBuilder`](./graviton-builder.md) | The `GravitonBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with Graviton worker nodes to run your ARM64 workloads.
| [`ObservabilityBuilder`](./observability-builder.md) | The `ObservabilityBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up Observability on an existing EKS cluster or a new EKS cluster.
| [`WindowsBuilder`](./windows-builder.md) | The `WindowsBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with windows to run your windows workloads.


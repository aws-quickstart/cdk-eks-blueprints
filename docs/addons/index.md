# Add-ons

The `eks-blueprints` framework leverages a modular approach to managing [Add-ons](https://kubernetes.io/docs/concepts/cluster-administration/addons/) that run within the context of a Kubernetes cluster. Customers are free to select the add-ons that run in each of their blueprint clusters.

Within the context of the `eks-blueprints` framework, an add-on is abstracted as `ClusterAddOn` interface, and the implementation of the add-on interface can do whatever is necessary to support the desired add-on functionality. This can include applying manifests to a Kubernetes cluster or calling AWS APIs to provision new resources.

Here's an improved version of the public documentation abstract with enhanced readability:

## Add-on Dependencies and Ordering in EKS Blueprints

Add-ons in EKS Blueprints rely on CDK/CloudFormation constructs for provisioning. By default, these constructs don't guarantee a specific order unless explicitly defined using the [CDK dependency mechanism](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib-readme.html#dependencies).

**Default Behavior**
- Add-ons without explicit dependencies are provisioned concurrently in an arbitrary order.
- The order in which you add add-ons to the blueprint may not matter if there are no explicit dependencies between them.

Lack of explicit dependencies can lead to:
- Race conditions
- Non-deterministic behavior
- Difficult-to-troubleshoot problems

For example, if an add-on requires the AWS LoadBalancer Controller to be in place, but there's no explicit dependency, the dependent add-on might start installing before the ALB controller is fully provisioned.

### Built-in Dependencies

Many add-ons in EKS Blueprints have pre-defined dependencies. For example, `Istio*` add-ons depend on `IstioBase`, `AmpAddOn` depends on `AdotCollectorAddOn`, etc.

These dependencies are implemented using the `@dependable` decorator applied to the `deploy` method of the dependent add-on:

```typescript
export class AmpAddOn implements ClusterAddOn {
    @dependable(AdotCollectorAddOn.name)
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        // Implementation
    }
}
```

### Custom Ordering

For cases where the framework doesn't capture all necessary dependencies, you have two options:

1. Subclass an add-on and override the `deploy` method to declare additional dependencies.
2. Use the EKS Blueprints framework's mechanism to create dependencies at the project level.

**Creating Dependencies at the Project Level**

To ensure one add-on is installed before another:

1. Ensure the prerequisite add-on is added to the blueprint ahead of the dependent add-ons.
2. Mark the prerequisite add-on as "strictly ordered" using:

```typescript
Reflect.defineMetadata("ordered", true, blueprints.addons.PrerequisiteAddOn);
```

This ensures that all add-ons declared after the marked add-on will only be provisioned after it's successfully deployed.

### Example

```typescript
// Enable detailed logging
blueprints.utils.logger.settings.minLevel = 1;

// Mark AwsLoadBalancerControllerAddOn as requiring strict ordering
Reflect.defineMetadata("ordered", true, blueprints.addons.AwsLoadBalancerControllerAddOn);

blueprints.EksBlueprint.builder()
    .addOns(new VpcCniAddon) // add all add-ons that do NOT need to depend on ALB before the ALB add-on
    .addOns(new AwsLoadBalancerControllerAddOn())
    .addOns(new MyAddOn()) // Automatically depends on AwsLoadBalancerControllerAddOn
    .build(...);
```

Note: You can mark multiple add-ons as `ordered` if needed.

## Supported Add-ons

The framework currently supports the following add-ons.

| Addon | Description | x86_64/amd64 | arm64 |
|-------|:-----------:|:------------:|:-----:|
| [`ACKAddOn`](./ack-addon.md)                                             | Adds ACK (AWS Controllers for Kubernetes .                                                                 | ✅ |
| [`AdotAddOn`](./adot-addon.md)                                            | Adds AWS Distro for OpenTelemetry (ADOT) Operator.                                                                 | ✅ | ✅ |
| [`AmpAdotAddOn`](./amp-addon.md)                                          | Deploys ADOT Collector for Prometheus to remote write metrics from AMP.               | ✅ | ✅ |
| [`AppMeshAddOn`](./app-mesh.md)                                           | Adds an AppMesh controller and CRDs.                                                  | ✅ |
| [`ApacheAirflowAddOn`](./apache-airflow.md)                                           | This add-on is an implementation of Apache Airflow on EKS using the official helm chart.                                                  | ✅ |
| [`ArgoCDAddOn`](./argo-cd.md)                                             | Provisions Argo CD into your cluster.                                                                                                 | ✅ | ✅ |
| [`AWS Batch for EKS`](./aws-batch-on-eks.md)                              | Enables EKS cluster to be used with AWS Batch on EKS                                                                    | ✅ | ✅ |
| [`AWS CloudWatch Insgihts`](./aws-cloudwatch-insights.md) | Provisions CloudWatch Insights to be used with the EKS cluster. | ✅ | ✅ |  
| [`AWS for Fluent Bit`](./aws-for-fluent-bit.md)                           | Provisions Fluent Bit into your cluster for log aggregation and consumption.                                                                        | ✅ | ✅
| [`AWS Load Balancer Controller`](./aws-load-balancer-controller.md)       | Provisions the AWS Load Balancer Controller into your cluster.                                                                        | ✅ | ✅ |
| [`AWS Node Termination Handler`](./aws-node-termination-handler.md)       | Provisions Node Termination Handler into your cluster.                                                                        | ✅ |
| [`AWS Private CA Issuer`](./aws-privateca-issuer.md)                      | Installs AWS Private CA Issuer into your cluster.                                                                        | ✅ |
| [`Backstage`](./backstage.md)                      | Installs Backstage.                                                                        | ✅ |
| [`CertManagerAddOn`](./cert-manager.md)                                   | Adds Certificate Manager to your EKS cluster.                                                             | ✅ | ✅ |
| [`CalicoOperatorAddOn`](./calico-operator.md)                             | Adds the Calico CNI/Network policy cluster.                                                                                       | ✅ | ✅ |
| [`CloudWatchAdotAddOn`](./cloudwatch-adot-addon.md)                       | Adds Cloudwatch exporter based on ADOT operator integrating monitoring with CloudWatch.                                                              | ✅ | ✅
| [`CloudWatchLogsAddOn`](./cloudwatch-logs.md)                       | Adds AWS for Fluent Bit to the cluster that exports logs to CloudWatch.                   | ✅ | ✅ 
| [`ClusterAutoscalerAddOn`](./cluster-autoscaler.md)                       | Adds the standard cluster autoscaler.                                                          | ✅ | ✅
| [`ContainerInsightsAddOn`](./container-insights.md)                       | Adds support for container insights.                                                          | ✅ | ✅                                         |
| [`CoreDnsAddOn`](./coredns.md)                                         | Adds CoreDNS Amazon EKS add-on. CoreDNS is a flexible, extensible DNS server that can serve as the Kubernetes cluster DNS.             | ✅ | ✅ |
| [`DatadogAddOn`](./datadog.md) | Adds [Datadog](https://www.datadoghq.com/) Amazon EKS add-on. Datadog is the monitoring and security platform for cloud applications.  |                         ✅ | ✅
| [`Dynatrace`](https://github.com/dynatrace-oss/dynatrace-eks-blueprints-addon)           | Adds the [Dynatrace](https://www.dynatrace.com/) [OneAgent Operator](https://github.com/Dynatrace/dynatrace-oneagent-operator).        | ✅ | 
| [`EbsCsiDriverAddOn`](./ebs-csi-driver.md)                             | Adds EBS CSI Driver Amazon EKS add-on. This driver manages the lifecycle of Amazon EBS volumes for persistent storage.                 | ✅ | ✅ |
| [`EfsCsiDriverAddOn`](./efs-csi-driver.md)                             | Adds EFS CSI Driver Amazon EKS add-on. This driver manages the lifecycle of Amazon EFS volumes for persistent storage.                 | ✅ | ✅ |
| [`EmrOnEksAddOn`](./emr-eks.md)                             | Enable EKS cluster to be used with EMR on EKS          | ✅ | ✅ |
| [`ExternalDnsAddOn`](./external-dns.md)                                   | Adds [External DNS](https://github.com/kubernetes-sigs/external-dns) support for AWS to the cluster, integrating with Amazon Route 53. | ✅ | ✅ |
| [`ExternalSecretsAddOn`](./external-secrets.md)                        | Adds [External Secrets Operator](https://github.com/external-secrets/external-secrets) to the cluster.| ✅ | ✅ |
| [`FluxcdAddOn`](./fluxcd.md)                                   | Setting up [Fluxcd](https://fluxcd.io/) to manage one or more Kubernetes clusters.                                 | ✅ | ✅
| [`GpuOperatorAddon`](./gpu-operator.md)                      |  Deploys [NVIDIA GPU Operator](https://github.com/NVIDIA/gpu-operator) on your EKS Cluster to manage configuration of drivers and software dependencies for GPU instances  | ✅ | ✅ |
| [`GrafanaOperatorAddon`](./grafana-operator.md)                                   | Deploys [GrafanaOperatorAddon](https://github.com/grafana-operator/grafana-operator#:~:text=The%20grafana%2Doperator%20is%20a,an%20easy%20and%20scalable%20way)  on your EKS Cluster to manage Amazon Managed Grafana and other external Grafana instances.                                 | ✅ | ✅ |
| [`IngressNginxAddOn`](./ingress-nginx.md)                                  | Adds Kubernetes NGINX ingress controller  | ✅ | ✅ |                    
| [`IstioBaseAddOn`](./istio-base.md)                                  | Adds support for Istio base chart to the EKS cluster. | ✅ | ✅ |
| [`InstanaAddOn`](./instana-addon.md)                                  | Adds the IBM® [Instana®](https://www.ibm.com/products/instana) [Agent Operator](https://github.com/instana/instana-agent-operator) to the EKS cluster. | ✅ | ✅ |
| [`IstioControlPlaneAddOn`](./istio-control-plane.md)                | Installs Istio Control Plane addon to the EKS cluster. | ✅ | ✅ |
| [`IstioCniAddOn`](./istio-cni.md)                | Installs Istio Cni Plugin addon to the EKS cluster. | ✅ | ✅ |
| [`IstioIngressGatewayAddOn`](./istio-ingress-gateway.md)                | Installs Istio Ingress Gateway Plugin to the EKS cluster. | ✅ | ✅ |
| [`JupyterHubAddOn`](./jupyterhub.md)                                   | Adds [JupyterHub](https://zero-to-jupyterhub.readthedocs.io/en/latest/#) support for AWS to the cluster.                               | ✅ | ✅ |
| [`Kasten-K10AddOn`](./kasten-k10.md)                          | Kasten K10 add-on installs Kasten K10 into your Amazon EKS cluster. | ✅ | 
| [`KedaAddOn`](./keda.md)                                      | Installs [Keda](https://github.com/kedacore/keda) into EKS cluster. | ✅ | ✅ |
| [`Keptn`](https://github.com/keptn-sandbox/keptn-eks-blueprints-addon)           | [Keptn](https://keptn.sh/) Control Plane and Execution Plane AddOn.                                                                    | ✅ |  
| [`KnativeAddOn`](./knative-operator.md)                                         | Deploys the [KNative Operator](https://knative.dev/docs/install/operator/knative-with-operators/) to ease setting up the rest of KNatives CRDs                                                          | ✅ | ✅ 
| [`KomodorAddOn`](https://github.com/komodorio/komodor-eks-blueprints-addon)    | Adds the [Komodor Agent](https://github.com/komodorio/helm-charts/tree/master/charts/komodor-agent) to the EKS Cluster.                                                         | ✅ | ✅ 
| [`KonveyorAddOn`](https://github.com/claranet-ch/konveyor-eks-blueprint-addon)    | Adds [Konveyor](https://www.konveyor.io/) to the EKS Cluster.                                                         | ✅ | ✅ |
| [`KubecostAddOn`](./kubecost.md)                                       | Adds [Kubecost](https://kubecost.com) cost analyzer to the EKS cluster.                                                  | ✅ |               
| [`KubeflowAddOn`](./kubeflow.md)                                       | Adds [kubeflow](https://awslabs.github.io/kubeflow-manifests/) Kubeflow pipeline addon the EKS cluster.                                | ✅ | 
| [`KubeRayAddOn`](./kuberay-operator.md)                      | Installs the [KubeRay Operator](https://docs.ray.io/en/latest/cluster/kubernetes/index.html).                                                                        | ✅ | ✅ | 
| [`KubeviousAddOn`](./kubevious.md)                                     | Adds [Kubevious](https://github.com/kubevious/kubevious) open source Kubernetes dashboard to an EKS cluster.                           |  ✅ | 
| [`KarpenterAddOn`](./karpenter.md)                                     | Adds [Karpenter](https://github.com/awslabs/karpenter) support for Amazon EKS.                                                         | ✅ | ✅ |
| [`KubeProxyAddOn`](./kube-proxy.md)                                    | Adds kube-proxy Amazon EKS add-on. Kube-proxy maintains network rules on each Amazon EC2 node.                                         | ✅ | ✅ |
| [`KubeStateMetricsAddOn`](./kube-state-metrics.md)                  | Adds [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics) into the EKS cluster.                                          | ✅ | ✅ |
| [`KubesharkAddOn`](./kubeshark.md)       | [Deep visibility and monitoring of all API traffic](https://github.com/kubeshark/kubeshark)                  | ✅ | ✅ |
| [`MetricsServerAddOn`](./metrics-server.md)                               | Adds metrics server (pre-req for HPA and other monitoring tools).                                                                      | ✅ | ✅ |
| [`NewRelicAddOn`](./newrelic.md)                                       | Adds [New Relic](https://newrelic.com/) and [Pixie](https://pixielabs.ai/) observability for Amazon EKS.                               | ✅ | 
| [`NginxAddOn`](./nginx.md)                                             | Adds NGINX ingress controller  | ✅ | ✅ |                                                                                                        |
| [`NeuronDevicePluginAddOn`](./neuron-device-plugin-addon.md)                                             | Adds Neuron Device Plugin Addon  | ✅ |  |
| [`NeuronMonitorAddOn`](./neuron-monitor-addon.md)                                             | Adds Neuron Monitor Addon  | ✅ |  | 
| [`OpaGatekeeperAddOn`](./opa-gatekeeper.md)                            | Adds OPA Gatekeeper                                                                                                                    | ✅ | ✅ |
| [`ParalusAddOn`](./paralus.md)                            | Adds [Paralus](https://paralus.io/)                                                                                                                   | ✅ | ✅ |
| [`PixieAddOn`](./pixie.md)                                             | Adds [Pixie](https://px.dev) to the EKS Cluster. Pixie provides auto-telemetry for requests, metrics, application profiles, and more.  | ✅ | 
| [`PrometheusNodeExporterAddOn`](./prometheus-node-exporter.md)      | Adds [prometheus-node-exporter](https://github.com/prometheus/node_exporter) to the EKS Cluster. Prometheus Node Exporter enables you to measure various machine resources such as memory, disk and CPU utilization.  | ✅ | ✅ |
| [`Rafay`](./rafay.md) | Adds [Rafay’s Kubernetes Operations Platform (KOP)](https://rafay.co/) to the EKS Cluster.  Rafay allows you to deploy, operate, and manage the lifecycle of Kubernetes clusters | ✅ |
| [`SecretsStoreAddOn`](./secrets-store.md)                              | Adds AWS Secrets Manager and Config Provider for Secret Store CSI Driver to the EKS Cluster.                                           | ✅ | ✅ |
| [`Snyk`](https://github.com/snyk-partners/snyk-monitor-eks-blueprints-addon)  | Adds the [Snyk Monitor](https://github.com/snyk/kubernetes-monitor) to the EKS Cluster.                                                | ✅ |
| [`SSMAgentAddOn`](./ssm-agent.md)                                      | Adds [Amazon SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) to worker nodes.                  | ✅ | 
| [`UpboundUniversalCrossplaneAddOn`](./upbound-universal-crossplane.md)                                      | Allows Elastic Kubernetes Service (Amazon EKS) clusters to manage the lifecycle of Crossplane distribution.                  | ✅ | 
| [`VpcCniAddOn`](./vpc-cni.md)                                          | Adds the Amazon VPC CNI Amazon EKS addon to support native VPC networking for Amazon EKS.                                              | ✅ | ✅ |
| [`VeleroAddOn`](./velero.md)                                           | Adds [Velero](https://velero.io/) to the EKS Cluster.                                                                                  | ✅ | ✅ |
| [`XrayAddOn`](./xray.md)                                                  | Adds XRay Daemon to the EKS Cluster.                                                                                                   | NA | NA
| [`XrayAdotAddOn`](./xray-adot-addon.md)                                   | Deploys ADOT Collector for Xray to receive traces from your workloads.                                                                 | ✅ | ✅ |
| ~~[`GmaestroAddOn`](./gmaestro.md)~~ | Deprecated due to EOL. Adds [gMaestro](https://app.granulate.io) cost optimization solution for EKS cluster.                                                                         |
| [`EksPodIdentityAgentAddOn`](./eks-pod-identity-agent.md)       | [Setting up the EKS Pod Identity Agent](https://docs.aws.amazon.com/en_ca/eks/latest/userguide/pod-id-agent-setup.html)                  | ✅ | ✅ |


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
     * When global helm version validation is enabled with HelmAddOn.validateHelmVersions = true
     * allows to skip validation for a particular helm add-on. 
     */
    skipVersionValidation?: boolean,

    /**
     * Optional values for the helm chart.
     */
    values?: Values
```

Ability to set repository url may be leveraged for private repositories.

Version field can be modified from the default chart version, e.g. if the add-on should be upgraded to the desired version, however, since the helm chart version supplied by the customer may not have been tested as part of the Blueprints release process, Blueprints community may not be able to reproduce/fix issues related to the helm chart version upgrade.

# Helm Version Validation

All add-ons that derive from `HelmAddOn` support optional version validation against the latest published version in the target helm repository. 

Helm version validation can result either in a warning on console during `list`, `synth` and `deploy` operations or an exception if the target helm repository contains higher version than the one leveraged in the add-on. 

Example output:

```
INFO  Chart argo-cd-4.9.12 is at the latest version. 
INFO  Chart external-dns-6.6.0 is at the latest version. 
WARN Upgrade is needed for chart gatekeeper-3.8.1: latest version is 3.9.0-beta.2. 
INFO  Chart appmesh-controller-1.5.0 is at the latest version. 
INFO  Chart tigera-operator-v3.23.2 is at the latest version. 
WARN Upgrade is needed for chart adot-exporter-for-eks-on-ec2-0.1.0: latest version is 0.6.0. 
INFO  Chart aws-load-balancer-controller-1.4.2 is at the latest version. 
INFO  Chart nginx-ingress-0.14.0 is at the latest version. 
INFO  Chart velero-2.30.1 is at the latest version. 
INFO  Chart falco-1.19.4 is at the latest version. 
WARN Upgrade is needed for chart karpenter-0.13.1: latest version is 0.13.2. 
INFO  Chart kubevious-1.0.10 is at the latest version. 
INFO  Chart aws-efs-csi-driver-2.2.7 is at the latest version. 
INFO  Chart keda-2.7.2 is at the latest version. 
INFO  Chart secrets-store-csi-driver-1.2.1 is at the latest version. 
```

- **Enable/Disable Helm version validation globally**

```typescript
import { HelmAddOn } from '@aws-quickstart/eks-blueprints';

HelmAddOn.validateHelmVersions = true; // by default will print out warnings
HelmAddOn.failOnVersionValidation = true; // enable synth to throw exceptions on validation check failures

```

- **Enable/Disable Helm version validation per add-on**

```typescript
new blueprints.addons.MetricsServerAddOn({
    skipVersionValidation: true
})
```

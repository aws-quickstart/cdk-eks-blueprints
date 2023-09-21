# GPU Builder

The `GravitonBuilder` allows you to get started with a builder class to configure with required setup as you prepare a blueprint for setting up EKS cluster with Graviton worker nodes to run your ARM64 workloads. 

The `GravitonBuilder` creates the following:
- An EKS Cluster` with passed k8s version and cluster tags.
- A nodegroup to schedule ARM64 workloads with parameters passed.

## Input Parameters

`GravitonOptions` which takes inputs to `GravitonBuilder` supports following parameters:

- `kubernetesVersion` : Required field, Kubernetes version to use for the cluster
- `instanceClass`: Required field, Instance class to use for the cluster
- `instanceSize`:  Required field, Instance size to use for the cluster

## Supported Methods
 
`GravitonBuilder` supports following methods for setting up required day 2 operational tooling on Amazon EKS with Graviton nodes:

- `addIstioBaseAddOn`: This method helps you to add `IstioBaseAddOn` blueprints addon along with supporting `IstioBaseAddOnProps` parameters.
- `addIstioControlPlaneAddOn`: This method helps you to add `IstioControlPlaneAddOn` blueprints addon along with supporting `IstioControlPlaneAddOnProps` parameters.
- `addKubeStateMetricsAddOn`: This method helps you to add `KubeStateMetricsAddOn` blueprints addon along with supporting `KubeStateMetricsAddOnProps` parameters.
- `addMetricsServerAddOn`: This method helps you to add `MetricsServerAddOn` blueprints addon along with supporting `MetricsServerAddOnProps` parameters.
- `addPrometheusNodeExporterAddOn`: This method helps you to add `PrometheusNodeExporterAddOn` blueprints addon along with supporting `PrometheusNodeExporterAddOnProps` parameters.
- `addExternalsSecretsAddOn`: This method helps you to add `ExternalsSecretsAddOn` blueprints addon along with supporting `ExternalsSecretsAddOnProps` parameters.
- `addSecretsStoreAddOn`: This method helps you to add `SecretsStoreAddOn` blueprints addon along with supporting `SecretsStoreAddOnProps` parameters.
- `addCalicoOperatorAddOn`: This method helps you to add `CalicoOperatorAddOn` blueprints addon along with supporting `CalicoOperatorAddOnProps` parameters.
- `addCertManagerAddOn`: This method helps you to add `CertManagerAddOn` blueprints addon along with supporting `CertManagerAddOnProps` parameters.
- `addAdotCollectorAddOn`: This method helps you to add `AdotCollectorAddOn` blueprints addon along with supporting `AdotCollectorAddOnProps` parameters.
- `addAmpAddOn`: This method helps you to add `AmpAddOn` blueprints addon along with supporting `AmpAddOnProps` parameters.
- `addCloudWatchLogsAddOn`: This method helps you to add `CloudWatchLogsAddon` blueprints addon along with supporting `CloudWatchLogsAddonProps` parameters.
- `addEfsCsiDriverAddOn`: This method helps you to add `EfsCsiDriver` blueprints addon along with supporting `EfsCsiDriverProps` parameters.
- `addFluxCDAddOn`: This method helps you to add `FluxCDAddOn` blueprints addon along with supporting `FluxCDAddOnProps` parameters.
- `addGrafanaOperatorAddOn`: This method helps you to add `GrafanaOperatorAddon` blueprints addon along with supporting `GrafanaOperatorAddonProps` parameters.
- `addXrayAdotAddOn`: This method helps you to add `XrayAdotAddOn` blueprints addon along with supporting `XrayAdotAddOnProps` parameters.

### Demonstration - Running Graviton Nodes on EKS Cluster

The below usage helps you with a demonstration to use `GravitonBuilder` to configure a required setup as you prepare a blueprint for setting up Graviton nodes on a new EKS cluster.

```typescript
import * as blueprints from "@aws-quickstart/eks-blueprints";
import { CfnWorkspace } from "aws-cdk-lib/aws-aps";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { GravitonBuilder, GravitonOptions } from '../common/graviton-builder';

export default class GravitonConstruct {
    build(scope: Construct, id: string) {
        const account = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;
        const stackID = `${id}-blueprint`;

        const ampWorkspaceName = "graviton-amp-workspace";
        const ampWorkspace: CfnWorkspace =
            blueprints.getNamedResource(ampWorkspaceName);

        const options: GravitonOptions = {
            kubernetesVersion: eks.KubernetesVersion.of("1.27"),
            instanceClass: ec2.InstanceClass.M7G,
            instanceSize: ec2.InstanceSize.LARGE
        };

        GravitonBuilder.builder(options)
            .account(account)
            .region(region)
            .resourceProvider(
                blueprints.GlobalResources.Vpc,
                new blueprints.VpcProvider()
            )
            .resourceProvider(
                "efs-file-system",
                new blueprints.CreateEfsFileSystemProvider({
                    name: "efs-file-system",
                })
            )
            .resourceProvider(
                ampWorkspaceName,
                new blueprints.CreateAmpProvider(
                    ampWorkspaceName,
                    ampWorkspaceName
                )
            )
            .addIstioBaseAddOn()
            .addIstioControlPlaneAddOn()
            .addMetricsServerAddOn()
            .addKubeStateMetricsAddOn()
            .addPrometheusNodeExporterAddOn()
            .addExternalsSecretsAddOn()
            .addSecretsStoreAddOn()
            .addCalicoOperatorAddOn()
            .addCertManagerAddOn()
            .addAdotCollectorAddOn()
            .addAmpAddOn({
                ampPrometheusEndpoint: ampWorkspace.attrPrometheusEndpoint
            })
            .addCloudWatchLogsAddOn({
                logGroupPrefix: "/aws/eks/graviton-blueprint",
            })
            .addEfsCsiDriverAddOn()
            .addFluxCDAddOn()
            .addGrafanaOperatorAddOn()
            .addXrayAdotAddOn()
            .build(scope, stackID);
    }
}
```

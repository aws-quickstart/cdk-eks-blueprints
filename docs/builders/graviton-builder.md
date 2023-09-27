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

### Demonstration - Running Graviton Nodes on EKS Cluster

The below usage helps you with a demonstration to use `GravitonBuilder` to configure a required setup as you prepare a blueprint for setting up Graviton nodes on a new EKS cluster.

```typescript
import * as blueprints from "@aws-quickstart/eks-blueprints";
import { CfnWorkspace } from "aws-cdk-lib/aws-aps";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { Construct } from "constructs";
import { GravitonBuilder } from '../common/graviton-builder';
import { MngClusterProviderProps } from '../cluster-providers';

export default class GravitonConstruct {
    build(scope: Construct, id: string) {
        const account = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;
        const stackID = `${id}-blueprint`;

        const ampWorkspaceName = "graviton-amp-workspace";
        const ampWorkspace: CfnWorkspace =
            blueprints.getNamedResource(ampWorkspaceName);

        const options: Partial<MngClusterProviderProps> = {
            version: eks.KubernetesVersion.of("1.27"),
            instanceTypes: ec2.InstanceType["m5.xlarge"]
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

import { BlueprintBuilder } from '../stacks';
import * as utils from "../utils";
import * as addons from '../addons';
import * as spi from '../spi';
import { MngClusterProvider } from '../cluster-providers';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from "aws-cdk-lib/aws-eks";
import * as ec2 from "aws-cdk-lib/aws-ec2";


/**
 * Configuration options for Graviton Builder.
 */
export interface GravitonOptions {
    kubernetesVersion: eks.KubernetesVersion,
    instanceClass: ec2.InstanceClass,
    instanceSize: ec2.InstanceSize
}
/** 
 * This builder class helps you prepare a blueprint for setting up 
 * Graviton nodes with EKS cluster. The `GravitonBuilder` creates the following:
 * 1. An EKS Cluster` with passed k8s version.
 * 2. A managed graviton nodegroup for ARM64 software.
 */

export class GravitonBuilder extends BlueprintBuilder {


    public addIstioBaseAddOn(props?: addons.IstioBaseAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.IstioBaseAddOn(props)
        );
    }

    public addIstioControlPlaneAddOn(props?: addons.IstioControlPlaneAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.IstioControlPlaneAddOn(props)
        );
    }

    public addKubeStateMetricsAddOn(props?: addons.KubeStateMetricsAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.KubeStateMetricsAddOn(props)
        );
    }

    public addMetricsServerAddOn(props?: addons.MetricsServerAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.MetricsServerAddOn(props)
        );
    }

    public addPrometheusNodeExporterAddOn(props?: addons.PrometheusNodeExporterAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.PrometheusNodeExporterAddOn(props)
        );
    }

    public addExternalsSecretsAddOn(props?: addons.ExternalsSecretsAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.ExternalsSecretsAddOn(props)
        );
    }

    public addSecretsStoreAddOn(props?: addons.SecretsStoreAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.SecretsStoreAddOn(props)
        );
    }

    public addCalicoOperatorAddOn(props?: addons.CalicoOperatorAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.CalicoOperatorAddOn(props)
        );
    }

    public addCertManagerAddOn(props?: addons.CertManagerAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.CertManagerAddOn(props)
        );
    }

    public addAdotCollectorAddOn(props?: addons.AdotCollectorAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.AdotCollectorAddOn(props)
        );
    }

    public addAmpAddOn(props: addons.AmpAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.AmpAddOn(props)
        );
    }

    public addCloudWatchLogsAddOn(props: addons.CloudWatchLogsAddonProps) : GravitonBuilder {
        return this.addOns(
            new addons.CloudWatchLogsAddon(props)
        );
    }

    public addEfsCsiDriverAddOn(props?: addons.EfsCsiDriverProps) : GravitonBuilder {
        return this.addOns(
            new addons.EfsCsiDriverAddOn(props)
        );
    } 

    public addFluxCDAddOn(props?: addons.FluxCDAddOnProps) : GravitonBuilder {  
        return this.addOns(
            new addons.FluxCDAddOn(props)
        );
    }  

    public addGrafanaOperatorAddOn(props?: addons.GrafanaOperatorAddonProps) : GravitonBuilder {
        return this.addOns(
            new addons.GrafanaOperatorAddon(props)
        );
    }  

    public addXrayAdotAddOn(props?: addons.XrayAdotAddOnProps) : GravitonBuilder {
        return this.addOns(
            new addons.XrayAdotAddOn(props)
        );
    }

    public static builder(options: GravitonOptions): GravitonBuilder {
        const builder = new GravitonBuilder();

        builder
            .clusterProvider(
                new MngClusterProvider({
                    version: options.kubernetesVersion,
                    instanceTypes: [new ec2.InstanceType(`${options.instanceClass}.${options.instanceSize}`)],
                    amiType: eks.NodegroupAmiType.AL2_ARM_64,
                    desiredSize: 3,
                    minSize: 2,
                    maxSize: 6,
                })
            )
            .addOns(
                new addons.NestedStackAddOn({
                    id: "usage-tracking-addon",
                    builder: UsageTrackingAddOn.builder(),
                }),
                new addons.AwsLoadBalancerControllerAddOn(),
                new addons.ClusterAutoScalerAddOn(),
                new addons.KubeProxyAddOn("v1.27.1-eksbuild.1"),
                new addons.VpcCniAddOn(),
            );
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for Graviton Accelerator
 */
export class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1ub15dn1f";

    public static builder(): spi.NestedStackBuilder {
        return {
            build(scope: Construct, id: string, props: NestedStackProps) {
                return new UsageTrackingAddOn(scope, id, props);
            }
        };
    }

    constructor(scope: Construct, id: string, props: NestedStackProps) {
        super(scope, id, utils.withUsageTracking(UsageTrackingAddOn.USAGE_ID, props));
    }
}
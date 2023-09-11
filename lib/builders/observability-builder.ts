import { BlueprintBuilder } from '../stacks';
import * as addons from '../addons';
import * as utils from "../utils";
import * as spi from '../spi';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ObservabilityBuilder extends BlueprintBuilder {

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS native services
     */
    public enableNativePatternAddOns(
        awsLoadBalancerProps?   : addons.AwsLoadBalancerControllerProps,
        certManagerProps?       : addons.CertManagerAddOnProps,
        containerInsightsProps? : addons.CertManagerAddOnProps,
        coreDnsProps?           : addons.coreDnsAddOnProps,
        kubeProxyVersion?       : string,
        kubeProxyAddOnProps?    : addons.kubeProxyAddOnProps,
        kubeStateMetricsProps?  : addons.KubeStateMetricsAddOnProps,
        metricsServerProps?     : addons.MetricsServerAddOnProps,
        prometheusNodeExpProps? : addons.PrometheusNodeExporterAddOnProps
        ): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(awsLoadBalancerProps),
            new addons.CertManagerAddOn(certManagerProps),
            new addons.ContainerInsightsAddOn(containerInsightsProps),
            new addons.CoreDnsAddOn(coreDnsProps),
            new addons.KubeProxyAddOn(kubeProxyVersion, kubeProxyAddOnProps),
            new addons.KubeStateMetricsAddOn(kubeStateMetricsProps),
            new addons.MetricsServerAddOn(metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(prometheusNodeExpProps));
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for combination of AWS native and 
     * AWS managed open source services
     */
    public enableMixedPatternAddOns(
        awsLoadBalancerProps?   : addons.AwsLoadBalancerControllerProps,
        certManagerProps?       : addons.CertManagerAddOnProps,
        adotCollectorProps?     : addons.AdotCollectorAddOnProps,
        coreDnsProps?           : addons.coreDnsAddOnProps,
        kubeProxyVersion?       : string,
        kubeProxyAddOnProps?    : addons.kubeProxyAddOnProps,
        kubeStateMetricsProps?  : addons.KubeStateMetricsAddOnProps,
        metricsServerProps?     : addons.MetricsServerAddOnProps,
        prometheusNodeExpProps? : addons.PrometheusNodeExporterAddOnProps
    ): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(awsLoadBalancerProps),
            new addons.CertManagerAddOn(certManagerProps),
            new addons.AdotCollectorAddOn(adotCollectorProps),
            new addons.CoreDnsAddOn(coreDnsProps),
            new addons.KubeProxyAddOn(kubeProxyVersion,kubeProxyAddOnProps),
            new addons.KubeStateMetricsAddOn(kubeStateMetricsProps),
            new addons.MetricsServerAddOn(metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(prometheusNodeExpProps));
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     * @param ampAddOnProps AmpAddonProps. This is mandatory.
     */
    public enableOpenSourcePatternAddOns(
        ampAddOnProps           : addons.AmpAddOnProps,
        awsLoadBalancerProps?   : addons.AwsLoadBalancerControllerProps,
        certManagerProps?       : addons.CertManagerAddOnProps,
        adotCollectorProps?     : addons.AdotCollectorAddOnProps,
        coreDnsProps?           : addons.coreDnsAddOnProps,
        kubeProxyVersion?       : string,
        kubeProxyAddOnProps?    : addons.kubeProxyAddOnProps,
        kubeStateMetricsProps?  : addons.KubeStateMetricsAddOnProps,
        metricsServerProps?     : addons.MetricsServerAddOnProps,
        prometheusNodeExpProps? : addons.PrometheusNodeExporterAddOnProps,
        externalSecretProps?    : addons.ExternalsSecretsAddOnProps,
        grafanaOperatorProps?   : addons.GrafanaOperatorAddonProps,
        ): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(awsLoadBalancerProps),
            new addons.CertManagerAddOn(certManagerProps),
            new addons.AdotCollectorAddOn(adotCollectorProps),
            new addons.AmpAddOn(ampAddOnProps),
            new addons.CoreDnsAddOn(coreDnsProps),
            new addons.ExternalsSecretsAddOn(externalSecretProps),
            new addons.GrafanaOperatorAddon(grafanaOperatorProps),
            new addons.KubeProxyAddOn(kubeProxyVersion,kubeProxyAddOnProps),
            new addons.KubeStateMetricsAddOn(kubeStateMetricsProps),
            new addons.MetricsServerAddOn(metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(prometheusNodeExpProps));
    }


    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS Fargate services
     */
    public enableFargatePatternAddons(
        awsLoadBalancerProps?   : addons.AwsLoadBalancerControllerProps,
        certManagerProps?       : addons.CertManagerAddOnProps,
        adotCollectorProps?     : addons.AdotCollectorAddOnProps,
        coreDnsProps?           : addons.CoreDnsAddOnProps,
        kubeProxyVersion?       : string,
        kubeProxyAddOnProps?    : addons.kubeProxyAddOnProps,
        kubeStateMetricsProps?  : addons.KubeStateMetricsAddOnProps,
        metricsServerProps?     : addons.MetricsServerAddOnProps,
        ): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(awsLoadBalancerProps),
            new addons.CertManagerAddOn(certManagerProps),
            new addons.AdotCollectorAddOn(adotCollectorProps),
            new addons.CoreDnsAddOn(coreDnsProps),
            new addons.KubeProxyAddOn(kubeProxyVersion, kubeProxyAddOnProps),
            new addons.KubeStateMetricsAddOn(kubeStateMetricsProps),
            new addons.MetricsServerAddOn(metricsServerProps));
    }


    /**
     * This method helps you prepare a blueprint for setting up observability with 
     * usage tracking addon
     */
    public static builder(): ObservabilityBuilder {
        const builder = new ObservabilityBuilder();
        builder.addOns(
            new addons.NestedStackAddOn({
                id: "usage-tracking-addon",
                builder: UsageTrackingAddOn.builder(),
            }));
        return builder;
    }
}

/**
 * Nested stack that is used as tracker for Observability Accelerator
 */
class UsageTrackingAddOn extends NestedStack {

    static readonly USAGE_ID = "qs-1u9l12gj7";

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

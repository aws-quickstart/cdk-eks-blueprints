import { BlueprintBuilder } from '../stacks';
import * as addons from '../addons';
import * as utils from "../utils";
import * as spi from '../spi';
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import merge from "ts-deepmerge";

export class ObservabilityBuilder extends BlueprintBuilder {

    private awsLoadbalancerProps: addons.AwsLoadBalancerControllerProps;
    private certManagerProps: addons.CertManagerAddOnProps;
    private containerInsightsProps: addons.ContainerInsightAddonProps;
    private coreDnsProps: addons.CoreDnsAddOnProps;
    private kubeProxyProps: addons.kubeProxyAddOnProps;
    private kubeProxyVersion: string = "auto";
    private kubeStateMetricsProps: addons.KubeStateMetricsAddOnProps;
    private metricsServerProps: addons.MetricsServerAddOnProps;
    private prometheusNodeExporterProps: addons.PrometheusNodeExporterAddOnProps;
    private adotCollectorProps: addons.AdotCollectorAddOnProps;
    private externalSecretProps: addons.ExternalsSecretsAddOnProps;
    private grafanaOperatorProps: addons.GrafanaOperatorAddonProps;
    private ampProps: addons.AmpAddOnProps;

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS native services
     */
    public enableNativePatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(this.awsLoadbalancerProps),
            new addons.CertManagerAddOn(this.certManagerProps),
            new addons.ContainerInsightsAddOn(this.containerInsightsProps),
            new addons.CoreDnsAddOn(this.coreDnsProps),
            new addons.KubeProxyAddOn(this.kubeProxyVersion,this.kubeProxyProps),
            new addons.KubeStateMetricsAddOn(this.kubeStateMetricsProps),
            new addons.MetricsServerAddOn(this.metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(this.prometheusNodeExporterProps));
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for combination of AWS native and 
     * AWS managed open source services
     */
    public enableMixedPatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(this.awsLoadbalancerProps),
            new addons.CertManagerAddOn(this.certManagerProps),
            new addons.AdotCollectorAddOn(this.adotCollectorProps),
            new addons.CoreDnsAddOn(this.coreDnsProps),
            new addons.KubeProxyAddOn(this.kubeProxyVersion, this.kubeProxyProps),
            new addons.KubeStateMetricsAddOn(this.kubeStateMetricsProps),
            new addons.MetricsServerAddOn(this.metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(this.prometheusNodeExporterProps));
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     */
    public enableOpenSourcePatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(this.awsLoadbalancerProps),
            new addons.CertManagerAddOn(this.certManagerProps),
            new addons.AdotCollectorAddOn(this.adotCollectorProps),
            new addons.AmpAddOn(this.ampProps),
            new addons.CoreDnsAddOn(this.coreDnsProps),
            new addons.ExternalsSecretsAddOn(this.externalSecretProps),
            new addons.GrafanaOperatorAddon(this.grafanaOperatorProps),
            new addons.KubeProxyAddOn(this.kubeProxyVersion,this.kubeProxyProps),
            new addons.KubeStateMetricsAddOn(this.kubeStateMetricsProps),
            new addons.MetricsServerAddOn(this.metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(this.prometheusNodeExporterProps));
    }

    public withAwsLoadBalancerControllerProps(props: addons.AwsLoadBalancerControllerProps){
        this.awsLoadbalancerProps = merge(this.awsLoadbalancerProps, props);
    }
    
    public withCertManagerProps(props: addons.CertManagerAddOnProps){
        this.certManagerProps = merge(this.certManagerProps, props);
    }

    public withContainerInsightProps(props: addons.ContainerInsightAddonProps) {
        this.containerInsightsProps = merge(this.containerInsightsProps,props);
    }

    public withCoreDnsProps(props:addons.CoreDnsAddOnProps) {
        this.coreDnsProps = merge(this.coreDnsProps, props);
    }

    public withKubeProxyProps(props:addons.kubeProxyAddOnProps, version: string) {
        this.kubeProxyProps = merge(this.kubeProxyProps, props);
        this.kubeProxyVersion = version;
    }

    public withKubeStateMetricsProps(props:addons.KubeStateMetricsAddOnProps) {
        this.kubeStateMetricsProps = merge(this.kubeStateMetricsProps, props);
    }

    public withMetricsServerProps(props:addons.MetricsServerAddOnProps) {
        this.metricsServerProps = merge(this.metricsServerProps, props);
    }

    public withPrometheusNodeExporterProps(props:addons.PrometheusNodeExporterAddOnProps) {
        this.prometheusNodeExporterProps = merge(this.prometheusNodeExporterProps, props);
    }

    public withAdotCollectorProps(props:addons.AdotCollectorAddOnProps) {
        this.adotCollectorProps = merge(this.adotCollectorProps, props);
    }

    public withExternalSecretsProps(props:addons.ExternalDnsProps) {
        this.externalSecretProps = merge(this.externalSecretProps, props);
    }

    public withGrafanaOperatorProps(props:addons.GrafanaOperatorAddonProps) {
        this.grafanaOperatorProps = merge(this.grafanaOperatorProps, props);
    }
    public withAmpProps(props:addons.AmpAddOnProps) {
        this.ampProps = merge(this.ampProps, props);
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
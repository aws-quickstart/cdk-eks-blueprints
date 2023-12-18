import {BlueprintBuilder, ControlPlaneLogType} from '../stacks';
import * as addons from '../addons';
import * as utils from "../utils";
import {cloneDeep} from "../utils";
import * as spi from '../spi';
import {NestedStack, NestedStackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';

export class ObservabilityBuilder extends BlueprintBuilder {

    private awsLoadbalancerProps: addons.AwsLoadBalancerControllerProps;
    private certManagerProps: addons.CertManagerAddOnProps;
    private cloudWatchInsightsAddOnProps: addons.CloudWatchInsightsAddOnProps;
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
            new addons.CloudWatchInsights(this.cloudWatchInsightsAddOnProps),
            new addons.CoreDnsAddOn(this.coreDnsProps),
            new addons.KubeProxyAddOn(this.kubeProxyVersion,this.kubeProxyProps),
            new addons.KubeStateMetricsAddOn(this.kubeStateMetricsProps),
            new addons.MetricsServerAddOn(this.metricsServerProps),
            new addons.PrometheusNodeExporterAddOn(this.prometheusNodeExporterProps));
    }
    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS Fargate services
     */
    public enableFargatePatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(this.awsLoadbalancerProps),
            new addons.CertManagerAddOn(this.certManagerProps),
            new addons.AdotCollectorAddOn(this.adotCollectorProps),
            new addons.CoreDnsAddOn(this.coreDnsProps),
            new addons.KubeProxyAddOn(this.kubeProxyVersion, this.kubeProxyProps),
            new addons.KubeStateMetricsAddOn(this.kubeStateMetricsProps),
            new addons.MetricsServerAddOn(this.metricsServerProps));
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

    /**
     * Enables control plane logging.
     * Enabling control plane logging is an in-place change for EKS as inferred from
     * https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
     *
     * @returns {ObservabilityBuilder} - The ObservabilityBuilder instance with control plane logging enabled.
     */
    public enableControlPlaneLogging(): ObservabilityBuilder {
        return this.enableControlPlaneLogTypes(
          ControlPlaneLogType.API,
          ControlPlaneLogType.AUDIT,
          ControlPlaneLogType.AUTHENTICATOR,
          ControlPlaneLogType.CONTROLLER_MANAGER,
          ControlPlaneLogType.SCHEDULER
        );
    }

    public withAwsLoadBalancerControllerProps(props: addons.AwsLoadBalancerControllerProps) : this {
        this.awsLoadbalancerProps = { ...this.awsLoadbalancerProps, ...cloneDeep(props) };
        return this;
    }
    
    public withCertManagerProps(props: addons.CertManagerAddOnProps) : this {
        this.certManagerProps = { ...this.certManagerProps, ...cloneDeep(props) };
        return this;
    }

    public withCloudWatchInsights(props: addons.CloudWatchInsightsAddOnProps) : this {
        this.cloudWatchInsightsAddOnProps = { ...this.cloudWatchInsightsAddOnProps, ...cloneDeep(props) };
        return this;
    }

    public withCoreDnsProps(props:addons.CoreDnsAddOnProps) : this {
        this.coreDnsProps = { ...this.coreDnsProps, ...cloneDeep(props) };
        return this;
    }

    public withKubeProxyProps(props:addons.kubeProxyAddOnProps, version: string) : this {
        this.kubeProxyProps = { ...this.kubeProxyProps, ...cloneDeep(props) };
        this.kubeProxyVersion = version;
        return this;
    }

    public withKubeStateMetricsProps(props:addons.KubeStateMetricsAddOnProps) : this {
        this.kubeStateMetricsProps = { ...this.kubeStateMetricsProps, ...cloneDeep(props) };
        return this;
    }

    public withMetricsServerProps(props:addons.MetricsServerAddOnProps) : this {
        this.metricsServerProps = { ...this.metricsServerProps, ...cloneDeep(props) };
        return this;
    }

    public withPrometheusNodeExporterProps(props:addons.PrometheusNodeExporterAddOnProps) : this {
        this.prometheusNodeExporterProps = { ...this.prometheusNodeExporterProps, ...cloneDeep(props) };
        return this;
    }

    public withAdotCollectorProps(props:addons.AdotCollectorAddOnProps) : this {
        this.adotCollectorProps = { ...this.adotCollectorProps, ...cloneDeep(props) };
        return this;
    }

    public withExternalSecretsProps(props:addons.ExternalDnsProps) : this {
        this.externalSecretProps = { ...this.externalSecretProps, ...cloneDeep(props) };
        return this;
    }

    public withGrafanaOperatorProps(props:addons.GrafanaOperatorAddonProps) : this {
        this.grafanaOperatorProps = { ...this.grafanaOperatorProps, ...cloneDeep(props) };
        return this;
    }
    public withAmpProps(props:addons.AmpAddOnProps) : this {
        this.ampProps = { ...this.ampProps, ...cloneDeep(props) };
        return this;
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
            })
        );
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
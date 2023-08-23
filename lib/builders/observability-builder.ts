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
    public enableNativePatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(),
            new addons.CertManagerAddOn(),
            new addons.ContainerInsightsAddOn(),
            new addons.CoreDnsAddOn(),
            new addons.KubeProxyAddOn(),
            new addons.KubeStateMetricsAddOn(),
            new addons.MetricsServerAddOn(),
            new addons.PrometheusNodeExporterAddOn());
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for combination of AWS native and 
     * AWS managed open source services
     */
    public enableMixedPatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(),
            new addons.AdotCollectorAddOn(),
            new addons.CertManagerAddOn(),
            new addons.CoreDnsAddOn(),
            new addons.KubeProxyAddOn(),
            new addons.KubeStateMetricsAddOn(),
            new addons.MetricsServerAddOn(),
            new addons.PrometheusNodeExporterAddOn());
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     */
    public enableOpenSourcePatternAddOns(ampPrometheusEndpoint: string): ObservabilityBuilder {
        return this.addOns(
            new addons.AwsLoadBalancerControllerAddOn(),
            new addons.AdotCollectorAddOn(),
            new addons.AmpAddOn({
                ampPrometheusEndpoint: ampPrometheusEndpoint,
            }),
            new addons.CertManagerAddOn(),
            new addons.CoreDnsAddOn(),
            new addons.ExternalsSecretsAddOn(),
            new addons.GrafanaOperatorAddon(),
            new addons.KubeProxyAddOn(),
            new addons.KubeStateMetricsAddOn(),
            new addons.MetricsServerAddOn(),
            new addons.PrometheusNodeExporterAddOn());
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

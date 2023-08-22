import * as blueprints from '../../lib';
import * as utils from "../utils";
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ObservabilityBuilder extends blueprints.BlueprintBuilder {

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS native services
     */
    public enableNativePatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.ContainerInsightsAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn());
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for combination of AWS native and 
     * AWS managed open source services
     */
    public enableMixedPatternAddOns(): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.AdotCollectorAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn());
    }

    /**
     * This method helps you prepare a blueprint for setting up observability 
     * returning an array of blueprint addons for AWS managed open source services
     */
    public enableOpenSourcePatternAddOns(ampPrometheusEndpoint: string): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.AdotCollectorAddOn(),
            new blueprints.addons.AmpAddOn({
                ampPrometheusEndpoint: ampPrometheusEndpoint,
            }),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.ExternalsSecretsAddOn(),
            new blueprints.addons.GrafanaOperatorAddon(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn());
    }

    /**
     * This method helps you prepare a blueprint for setting up observability with 
     * usage tracking addon
     */
    public static builder(): ObservabilityBuilder {
        const builder = new ObservabilityBuilder();
        builder.addOns(
            new blueprints.NestedStackAddOn({
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

    public static builder(): blueprints.NestedStackBuilder {
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

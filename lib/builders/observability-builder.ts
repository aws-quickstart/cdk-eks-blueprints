import * as blueprints from '../../lib';
import * as utils from "../utils";
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ObservabilityBuilder extends blueprints.BlueprintBuilder {

    public addNativeObservabilityBuilderAddOns(): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn(),
            new blueprints.addons.VpcCniAddOn());
    }

    public addMixedObservabilityBuilderAddOns(): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.AdotCollectorAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn(),
            new blueprints.addons.VpcCniAddOn());
    }

    public addOpenSourceObservabilityBuilderAddOns(): ObservabilityBuilder {
        return this.addOns(
            new blueprints.addons.AwsLoadBalancerControllerAddOn(),
            new blueprints.addons.AdotCollectorAddOn(),
            new blueprints.addons.CertManagerAddOn(),
            new blueprints.addons.CoreDnsAddOn(),
            new blueprints.addons.ExternalsSecretsAddOn(),
            new blueprints.addons.GrafanaOperatorAddon(),
            new blueprints.addons.KubeProxyAddOn(),
            new blueprints.addons.KubeStateMetricsAddOn(),
            new blueprints.addons.MetricsServerAddOn(),
            new blueprints.addons.PrometheusNodeExporterAddOn(),
            new blueprints.addons.VpcCniAddOn());
    }

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
export class UsageTrackingAddOn extends NestedStack {

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

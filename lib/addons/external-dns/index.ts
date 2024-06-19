import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from "constructs";
import { ClusterInfo, Values } from '../../spi';
import { HelmAddOn, HelmAddOnUserProps } from '../helm-addon';
import { merge } from "ts-deepmerge";
import { supportsALL } from '../../utils';


/**
 * Configuration options for the external DNS add-on.
 */
export interface ExternalDnsProps extends HelmAddOnUserProps {
    /**
     * Names of hosted zone provider named resources (@see LookupHostedZoneProvider) for external DNS.
     * Hosted zone providers are registered as named resource providers with the EksBlueprintProps.
     */
    readonly hostedZoneResources: string[];
    /**
     * List of sources to watch when synthesizing DNS records.  If empty, the default types are "service" and "ingress".
     */
    readonly sources?: string[];
}

const defaultProps = {
    name: 'external-dns',
    chart: 'external-dns',
    namespace: 'external-dns',
    repository: 'https://kubernetes-sigs.github.io/external-dns/',
    release: 'blueprints-addon-external-dns',
    version: '1.14.3',
    values: {},
};

/**
 * Implementation of the External DNS service: https://github.com/kubernetes-sigs/external-dns/.
 * It is required to integrate with Route53 for external DNS resolution. 
 */
@supportsALL
export class ExternalDnsAddOn extends HelmAddOn {

    private options: ExternalDnsProps;

    constructor(props: ExternalDnsProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props as ExternalDnsProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const region = clusterInfo.cluster.stack.region;
        const cluster = clusterInfo.cluster;
        const namespace = this.options.namespace ?? this.options.name;

        const namespaceManifest = new KubernetesManifest(cluster.stack, `${this.props.name}-ns`, {
            cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: { name: namespace },
            }],
            overwrite: true
        });

        const sa = cluster.addServiceAccount(this.props.name, { name: `${this.props.name}-sa`, namespace });

        const hostedZones = this.options.hostedZoneResources.map(e => clusterInfo.getRequiredResource<IHostedZone>(e));

        sa.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['route53:ChangeResourceRecordSets', 'route53:ListResourceRecordSets'],
                resources: hostedZones.map(hostedZone => hostedZone!.hostedZoneArn),
            }),
        );

        sa.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['route53:ListHostedZones'],
                resources: ['*'],
            }),
        );

        sa.node.addDependency(namespaceManifest);

        // Create a --zone-id-filter arg for each hosted zone
        const zoneIdFilterArgs = hostedZones.map((hostedZone) => `--zone-id-filter=${hostedZone!.hostedZoneId}`);

        let values: Values = {
            provider: "aws",
            extraArgs: zoneIdFilterArgs,
            aws: {
              region,
            },
            serviceAccount: {
              create: false,
              name: sa.serviceAccountName,
            },
        };

        values = merge(values, this.props.values ?? {});

        const sources = this.options.sources;

        if (sources) {
            values.sources = sources;
        }

        const chart = this.addHelmChart(clusterInfo, values);

        chart.node.addDependency(namespaceManifest);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(chart);
    }
}

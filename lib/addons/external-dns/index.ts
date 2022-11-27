import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { HelmAddOn, HelmAddOnUserProps } from '../helm-addon';
import merge from "ts-deepmerge";


/**
 * Configuration options for the external DNS add-on.
 */
export interface ExternalDnsProps extends HelmAddOnUserProps {
    /**
     * Names of hosted zone provider named resources (@see LookupHostedZoneProvider) for external DNS.
     * Hosted zone providers are registered as named resource providers with the EksBlueprintProps.
     */
    readonly hostedZoneResources: string[];
}

const defaultProps = {
    name: 'external-dns',
    chart: 'external-dns',
    namespace: 'external-dns',
    repository: 'https://charts.bitnami.com/bitnami',
    release: 'blueprints-addon-external-dns',
    version: '6.12.1',
    values: {},
};

/**
 * Implementation of the External DNS service: https://github.com/kubernetes-sigs/external-dns/.
 * It is required to integrate with Route53 for external DNS resolution. 
 */
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

        const namespaceManifest = new KubernetesManifest(cluster.stack, 'external-dns-ns', {
            cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: { name: namespace },
            }],
            overwrite: true
        });

        const sa = cluster.addServiceAccount(this.props.name, { name: 'external-dns-sa', namespace });

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

        let values = {
            provider: "aws",
            zoneIdFilters: hostedZones.map((hostedZone) => hostedZone!.hostedZoneId),
            aws: {
              region,
            },
            serviceAccount: {
              create: false,
             name: sa.serviceAccountName,
            },
        };

        values = merge(values, this.props.values ?? {});
        const chart = this.addHelmChart(clusterInfo, values);

        chart.node.addDependency(namespaceManifest);
        // return the Promise Construct for any teams that may depend on this
        return Promise.resolve(chart);
    }
}

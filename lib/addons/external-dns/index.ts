import { KubernetesManifest } from '@aws-cdk/aws-eks';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { Constants } from '..';

import { ClusterAddOn, ClusterInfo } from '../../spi';
import { HostedZoneProvider } from './hosted-provider';

/**
 * Configuration options for the external DNS add-on.
 */
export interface ExternalDnsProps {

    /**
     * @default `external-dns`
     */
    readonly namespace?: string;

    /**
     * @default `5.1.3`
     */
    readonly version?: string;

    /**
     * Hosted zone provider (@see HostedZoneProvider) that can provide one or more hosted zones for external DNS.
     */
    readonly hostedZone: HostedZoneProvider;
}

/**
 * Implementation of the External DNS service: https://github.com/kubernetes-sigs/external-dns/.
 * It is required to integrate with Route53 for external DNS resolution. 
 */
export class ExternalDnsAddon implements ClusterAddOn {

    readonly name = 'external-dns';

    constructor(private readonly options: ExternalDnsProps) {
    }

    deploy(clusterInfo: ClusterInfo): void {
        const region = clusterInfo.cluster.stack.region;
        const cluster = clusterInfo.cluster;
        const namespace = this.options.namespace ?? this.name;

        const namespaceManifest = new KubernetesManifest(cluster.stack, 'external-dns-ns', {
            cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: { name: namespace },
            }],
            overwrite: true
        });


        const sa = cluster.addServiceAccount(this.name, { name: 'external-dns-sa', namespace });

        const hostedZones = this.options.hostedZone.provide(clusterInfo);

        sa.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['route53:ChangeResourceRecordSets', 'route53:ListResourceRecordSets'],
                resources: hostedZones.map(hostedZone => hostedZone.hostedZoneArn),
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

        const chart = cluster.addHelmChart('ExternalDnsAddonChart', {
            namespace,
            repository: 'https://charts.bitnami.com/bitnami',
            chart: 'external-dns',
            release: Constants.SSP_ADDON,
            version: this.options.version ?? '5.1.3',
            values: {
                provider: 'aws',
                zoneIdFilters: hostedZones.map(hostedZone => hostedZone.hostedZoneId),
                aws: {
                    region,
                },
                serviceAccount: {
                    create: false,
                    name: sa.serviceAccountName,
                },
            },
        });

        chart.node.addDependency(namespaceManifest);
    }
}
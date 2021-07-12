import { KubernetesManifest } from '@aws-cdk/aws-eks';
import { Effect, PolicyStatement, Role } from '@aws-cdk/aws-iam';
import { IHostedZone, HostedZone, PublicHostedZone, CrossAccountZoneDelegationRecord, CnameRecord} from '@aws-cdk/aws-route53';
import { ClusterAddOn, ClusterInfo } from '../../stacks/cluster-types';


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

    readonly hostedZone: HostedZoneProvider;
}


export interface HostedZoneProvider {
    provide(clusterInfo: ClusterInfo): IHostedZone[];
}

/**
 * Simple lookup host zone provider
 */
export class LookupHostedZoneProvider implements HostedZoneProvider {

    /**
     * @param hostedZoneName name of the host zone to lookup
     * @param id  optional id for the structure (for tracking). set to hostzonename by default
     */
    constructor(private hostedZoneName: string, private id?: string) { }

    provide(clusterInfo: ClusterInfo): IHostedZone[] {
        return [HostedZone.fromLookup(clusterInfo.cluster.stack, this.id ?? `${this.hostedZoneName}-Lookup`, { domainName: this.hostedZoneName })];
    }
}
/**
 * Direct import hosted zone provider, based on a known hosted zone ID. 
 * Recommended method if hosted zone id is known, as it avoids extra look-ups.
 */
export class ImportHostedZoneProvider  implements HostedZoneProvider {

    constructor(private hostedZoneId: string, private id?: string) { }

    provide(clusterInfo: ClusterInfo): IHostedZone[] {
        return [HostedZone.fromHostedZoneId(clusterInfo.cluster.stack, this.id ??  `${this.hostedZoneId}-Import`, 'ZOJJZC49E0EPZ')];
    }
}

export class DelegatingHostedZoneProvider implements HostedZoneProvider {
    constructor(private parentDomain: string,
        private subdomain: string,
        private parentDnsAccountId: string,
        private delegatingRoleName: string,
        private wildcardSubdomain? : boolean) { }

    provide(clusterInfo: ClusterInfo): IHostedZone[] {
        const stack = clusterInfo.cluster.stack;

        const subZone = new PublicHostedZone(stack, `${this.subdomain}-SubZone`, {
            zoneName: this.subdomain
        });
        
        if (this.wildcardSubdomain) {
            new CnameRecord(stack, `${this.subdomain}-cname`, {
                zone: subZone,
                domainName: `${this.subdomain}`,
                recordName: `*.${this.subdomain}`
            });
        }

        // 
        // import the delegation role by constructing the roleArn.
        // Assuming the parent account has the delegating role with 
        // trust relationship setup to the child account.
        //
        const delegationRoleArn = stack.formatArn({
            region: '', // IAM is global in each partition
            service: 'iam',
            account: this.parentDnsAccountId,
            resource: 'role',
            resourceName: this.delegatingRoleName
        });

        const delegationRole = Role.fromRoleArn(stack, 'DelegationRole', delegationRoleArn);

        // create the record
        new CrossAccountZoneDelegationRecord(stack, `${this.subdomain}-delegate`, {
            delegatedZone: subZone,
            parentHostedZoneName: this.parentDomain, // or you can use parentHostedZoneId
            delegationRole,
        });

        return [subZone];
    }
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
            release: 'external-dns',
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
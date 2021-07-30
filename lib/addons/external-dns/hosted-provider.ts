import { ClusterInfo } from "../..";
import { IHostedZone, HostedZone, PublicHostedZone, CrossAccountZoneDelegationRecord, CnameRecord } from '@aws-cdk/aws-route53';
import { Role } from "@aws-cdk/aws-iam";

/**
 * Interface that abstracts how hosted zone(s) is obtained for external DNS. 
 * Implementations may either look up existing hosted zones or create new hosted zones in the context of the cluster life-cycle.
 * 
 * If hosted-zone life-cycle does not match the cluster life-cycle, the recommended approach is to create a separate CDK stack 
 * for hosted zone provisioning and leverage LookupHostedZoneProvider or ImportHostedZonewProvider. 
 */
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
export class ImportHostedZoneProvider implements HostedZoneProvider {

    constructor(private hostedZoneId: string, private id?: string) { }

    provide(clusterInfo: ClusterInfo): IHostedZone[] {
        return [HostedZone.fromHostedZoneId(clusterInfo.cluster.stack, this.id ?? `${this.hostedZoneId}-Import`, this.hostedZoneId)];
    }
}


export interface DelegatingHostedZoneProviderProps {

    /**
     * Parent domain name.
     */
    parentDomain: string,
    /**
     * Name for the child zone (expected to be a subdomain of the parent hosted zone).
     */
    subdomain: string,

    /**
     * Account Id for the parent hosted zone.
     */
    parentDnsAccountId: string,

    /**
     * Role name in the parent account for delegation. Must have trust relationship set up with the workload account where
     * the EKS Cluster Blueprint is provisioned (account level trust).
     */
    delegatingRoleName: string,

    /**
     * Where a wild-card entry should be created for the subdomain. In this case a wildcard CNAME record is created along with the subdomain.
     */
    wildcardSubdomain?: boolean
}

/**
 * Delegating provider is a convenience approach to have a global hosted zone record in a centralized 
 * account and subdomain records in respective workload accounts. 
 * 
 * The delegation part allows routing subdomain entries to the child hosted zone in the workload account.
 */
export class DelegatingHostedZoneProvider implements HostedZoneProvider {
    constructor(private options: DelegatingHostedZoneProviderProps) { }

    provide(clusterInfo: ClusterInfo): IHostedZone[] {
        const stack = clusterInfo.cluster.stack;

        const subZone = new PublicHostedZone(stack, `${this.options.subdomain}-SubZone`, {
            zoneName: this.options.subdomain
        });

        if (this.options.wildcardSubdomain) {
            new CnameRecord(stack, `${this.options.subdomain}-cname`, {
                zone: subZone,
                domainName: `${this.options.subdomain}`,
                recordName: `*.${this.options.subdomain}`
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
            account: this.options.parentDnsAccountId,
            resource: 'role',
            resourceName: this.options.delegatingRoleName
        });

        const delegationRole = Role.fromRoleArn(stack, 'DelegationRole', delegationRoleArn);

        // create the record
        new CrossAccountZoneDelegationRecord(stack, `${this.options.subdomain}-delegate`, {
            delegatedZone: subZone,
            parentHostedZoneName: this.options.parentDomain, // or you can use parentHostedZoneId
            delegationRole
        });

        return [subZone];
    }
}

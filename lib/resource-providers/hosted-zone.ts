import { Role } from "aws-cdk-lib/aws-iam";
import * as r53 from 'aws-cdk-lib/aws-route53';
import { ResourceContext, ResourceProvider } from "../spi";

/**
 * Simple lookup host zone provider
 */
export class LookupHostedZoneProvider implements ResourceProvider<r53.IHostedZone> {

    /**
     * @param hostedZoneName name of the host zone to lookup
     * @param id  optional id for the structure (for tracking). set to hostzonename by default
     */
    constructor(private hostedZoneName: string, private id?: string) { }

    provide(context: ResourceContext): r53.IHostedZone {
        return r53.HostedZone.fromLookup(context.scope, this.id ?? `${this.hostedZoneName}-Lookup`, { domainName: this.hostedZoneName });
    }
}
/**
 * Direct import hosted zone provider, based on a known hosted zone ID. 
 * Recommended method if hosted zone id is known, as it avoids extra look-ups.
 */
export class ImportHostedZoneProvider implements ResourceProvider<r53.IHostedZone> {

    constructor(private hostedZoneId: string, private id?: string) { }

    provide(context: ResourceContext): r53.IHostedZone {
        return r53.HostedZone.fromHostedZoneId(context.scope, this.id ?? `${this.hostedZoneId}-Import`, this.hostedZoneId);
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
export class DelegatingHostedZoneProvider implements ResourceProvider<r53.IHostedZone> {
    constructor(private options: DelegatingHostedZoneProviderProps) { }

    provide(context: ResourceContext): r53.IHostedZone {
        const stack = context.scope;

        const subZone = new r53.PublicHostedZone(stack, `${this.options.subdomain}-SubZone`, {
            zoneName: this.options.subdomain
        });

        if (this.options.wildcardSubdomain) {
            new r53.CnameRecord(stack, `${this.options.subdomain}-cname`, {
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

        const delegationRole = Role.fromRoleArn(stack, `${this.options.subdomain}-DelegationRole`, delegationRoleArn);

        // create the record
        new r53.CrossAccountZoneDelegationRecord(stack, `${this.options.subdomain}-delegate`, {
            delegatedZone: subZone,
            parentHostedZoneName: this.options.parentDomain, // or you can use parentHostedZoneId
            delegationRole
        });

        return subZone;
    }
}

import * as cdk from '@aws-cdk/core';
import * as es from '@aws-cdk/aws-elasticsearch';
import * as iam from '@aws-cdk/aws-iam';

/**
 * Configuration options for the ElasticsearchStack
 */
export interface ElasticsearchStackProps {
    /**
     * ID for the stack.
     */
    readonly id: string

    /**
     * The name for the Elasticsearch domain.
     * @default `elasticsearch-domain`
     */
    readonly domainName?: string

    /**
     * The username for the admin.
     * @default `admin`
     */
    readonly adminUsername?: string

    /**
     * The Secrets Manager key for the Elasticsearch admin password.
     * Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.
     * @default `elastic-search-secret-key`
     */
    readonly adminPasswordSecretKey?: string

    /**
     * Elasticsearch version.
     * @default `es.ElasticsearchVersion.V7_1`
     */
    readonly version?: es.ElasticsearchVersion;

    /**
     * Properties for the Elasticsearch domain. Allows for complete customization of the domain. 
     */
    readonly domainProps: es.DomainProps
}

/**
 * Default props for the add-on.
 */
const defaultProps: Partial<ElasticsearchStackProps> = {
    domainName: 'elasticsearch-domain',
    adminUsername: 'admin',
    adminPasswordSecretKey: 'elastic-search-secret-key',
    version: es.ElasticsearchVersion.V7_1
}

/**
 * ElasticsearchStack Provision a new AWS Managed Elasticsearch domain.
 */
export class ElasticsearchStack extends cdk.Stack {

    private props: ElasticsearchStackProps

    private stackProps?: cdk.StackProps

    constructor(scope: cdk.Construct, props: ElasticsearchStackProps, stackProps?: cdk.StackProps) {
        super(scope, props.id, stackProps)
        this.props = { ...defaultProps, ...props }
        this.stackProps = stackProps
    }

    public deploy(): es.Domain {
        /**
         * Build our domain Arn.
         */
        const region = this.stackProps?.env?.region
        const accountID = this.stackProps?.env?.account
        const domainName = this.props.domainName!
        const domainArn = `arn:aws:es:${region}:${accountID}:domain/${domainName}`

        /**
         * Configure IAM policy for a public domain.
         */
        const domainPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['es:ESHttp*'],
            principals: [new iam.AnyPrincipal()],
            resources: [`${domainArn}/*`]
        })

        /**
         * Deploy the Elasicsearch domain.
         */
        const version = this.props.version!
        const masterUserName = this.props.adminUsername
        const adminPasswordSecretKey = this.props.adminPasswordSecretKey!
        const masterUserPassword = cdk.SecretValue.secretsManager(adminPasswordSecretKey)

        const defaultDomainProps = {
            domainName,
            version,
            capacity: {
                masterNodes: 5,
                dataNodes: 20
            },
            ebs: {
                volumeSize: 20
            },
            zoneAwareness: {
                availabilityZoneCount: 3
            },
            logging: {
                slowSearchLogEnabled: true,
                appLogEnabled: true,
                slowIndexLogEnabled: true,
            },
            accessPolicies: [domainPolicy],
            fineGrainedAccessControl: {
                masterUserName,
                masterUserPassword
            },
            nodeToNodeEncryption: true,
            encryptionAtRest: {
                enabled: true
            },
            enforceHttps: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        }
        const domainProps = { ...defaultDomainProps, ...this.props.domainProps }
        return new es.Domain(this, domainName, domainProps);
    }
}

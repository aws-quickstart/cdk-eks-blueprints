import * as es from '@aws-cdk/aws-elasticsearch';
import { KubernetesManifest } from '@aws-cdk/aws-eks';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

import { ClusterAddOn, ClusterInfo } from "../../stacks/cluster-types";

/**
 * Configuration options for the external DNS add-on.
 */
export interface ExternalDnsProps {

    /**
     * @default `elastic-search`
     */
    readonly namespace?: string;

    /**
     * @default `5.1.3`
     */
    readonly version?: string;
}


export class CalicoAddOn implements ClusterAddOn {

    readonly name = 'elastic-search';

    constructor(private readonly options: ExternalDnsProps) {
    }

    deploy(clusterInfo: ClusterInfo): void {
        // 
        const cluster = clusterInfo.cluster;
        const namespace = this.options.namespace ?? this.name;

        const sa = cluster.addServiceAccount(this.name, { name: 'external-dns-sa', namespace });
        sa.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['es:ESHttp*'],
                resources: ["arn:aws:es:${AWS_REGION}:${ACCOUNT_ID}:domain/${ES_DOMAIN_NAME}"]
            }),
        );

        const prodDomain = new es.Domain(this, 'Domain', {
            version: es.ElasticsearchVersion.V7_1,
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
        });
    }
}

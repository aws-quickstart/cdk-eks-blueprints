import * as eks from '@aws-cdk/aws-eks';
import * as es from '@aws-cdk/aws-elasticsearch';
import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';

import { Constants } from "..";
import { ClusterInfo } from "../../spi/types";
import { Team } from "../../spi/team-contracts";
import { ClusterAddOn } from "../../spi/addon-contracts"
import { createNamespace } from "../../utils/namespace";

/**
 * Configuration options for the FluentBit add-on.
 */
export interface FluentBitAddOnProps {
    /**
     * The namespace for the FluentBit add-on.
     * @default `logging`
     */
    readonly namespace: string;

    /**
     * Props for Elasticsearch support.
     */
    readonly elasticsearch?: es.DomainAttributes
}

/**
 * Default props for the add-on.
 */
const defaultProps: FluentBitAddOnProps = {
    namespace: 'logging',
}

/**
 * FluentBitAddOn deploys FluentBit into an EKS cluster using the `aws-for-fluent-bit` Helm chart.
 * https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit
 */
export class FluentBitAddOn implements ClusterAddOn {

    readonly props: FluentBitAddOnProps

    constructor(props?: FluentBitAddOnProps) {
        this.props = { ...defaultProps, ...props }
    }

    deploy(clusterInfo: ClusterInfo): void {
        // Create the FluentBit namespace.
        const cluster = clusterInfo.cluster;
        const namespace = this.props.namespace
        createNamespace(cluster, namespace)

        // Create the FluentBut service account.
        const serviceAccountName = 'fluent-bit-service-account'
        const sa = cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: namespace
        });

        // Configure helm chart and deploy.
        if (this.props?.elasticsearch) {
            this.applyForElasticsearch(cluster, namespace, sa)
        } else {
            this.applyHelmChart(cluster, namespace)
        }
    }

    postDeploy(clusterInfo: ClusterInfo, teams: Team[]): void {
        // Nothing to do for now. 
    }

    /**
     * Applies FluentBit configured for AWS Managed Elasticsearch.
     * @param cluster The EKS cluster.
     * @param namespace The namespace for FluentBit.
     * @param serviceAccount The service account to use for FluentBit.
     */
    protected applyForElasticsearch(cluster: eks.Cluster, namespace: string, serviceAccount: eks.ServiceAccount) {
        // Grant SA write access for the Elasticsearch domain. 
        const stack = cluster.stack
        const id = `${namespace}-es-domain-id`
        const domainAttributes = this.props.elasticsearch
        if (!domainAttributes) {
            throw new Error(`Must supply Elasticsearch domain attributes.`);
        }
        const domain = es.Domain.fromDomainAttributes(stack, id, domainAttributes)
        domain.grantWrite(serviceAccount)

        // Configure our Helm chart values to enable Elasticsearch.    
        const domainEndpoint = domain.domainEndpoint
        const values = {
            serviceAccount: {
                name: serviceAccount.serviceAccountName,
                create: false
            },
            elasticsearch: {
                enabled: true,
                host: domainEndpoint,
                awsRegion: cluster.stack.region
            }
        }
        this.applyHelmChart(cluster, namespace, values)
    }

    /**
     * Apply the FluentBit helm chart.
     */
    protected applyHelmChart(cluster: eks.Cluster, namespace: string, values?: any) {
        cluster.addHelmChart("fluent-but-addon", {
            chart: "aws-for-fluent-bit",
            release: Constants.SSP_ADDON,
            repository: "https://aws.github.io/eks-charts",
            namespace,
            version: "0.1.7",
            values
        });
    }
}

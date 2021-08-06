import * as eks from '@aws-cdk/aws-eks';
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
    readonly elasticsearch?: ElasticsearchProps
}

export interface ElasticsearchProps {
    /**
     * The ARN for the Elasticsearch domain.
     */
    readonly domainArn: string

    /**
     * The endpoint for the Elasticsearch domain.
     */
    readonly domainEndpoint: string
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
        /**
         * Create the IAM Policy for the service account 
         * Allows the SA to make requests to the Elasticsearch domain. 
         */
        const domainProps = this.props?.elasticsearch
        const domainArn = domainProps?.domainArn!
        const policy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['es:ESHttp*'],
            resources: [domainArn]
        })
        serviceAccount.addToPrincipalPolicy(policy);

        /**
         * Configure our Helm chart values to enable Elasticsearch.
         */
        const domainEndpoint = domainProps?.domainEndpoint!
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

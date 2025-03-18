// https://www.gateway-api-controller.eks.aws.dev/latest/guides/deploy/#setup

import { Construct } from "constructs";
import { ClusterInfo, Values } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ServiceAccount } from "aws-cdk-lib/aws-eks";
import { getVpcLatticeControllerPolicy } from "./iam-policy";
import { GatewayApiCrdsStack } from "./sig-gateway-api";
import { Stack } from "aws-cdk-lib";
import * as customResources from 'aws-cdk-lib/custom-resources';
import * as ec2 from 'aws-cdk-lib/aws-ec2';


const AWS_GATEWAY_API_CONTROLLER_SA = 'gateway-api-controller';

// https://www.gateway-api-controller.eks.aws.dev/latest/guides/environment/#environment-variables
export interface AwsGatewayApiControllerAddOnProps extends HelmAddOnUserProps {
    /**
     * Service account configuration. Service Account creation is handled for user.
     */
    serviceAccount?: {
        create: boolean;
        name: string;
    };

    /**
     * A unique name to identify a cluster
     * @default Inferred from IMDS metadata
     */
    clusterName?: string;

    /**
     * VPC ID of the cluster when running controller outside the cluster
     * @default Inferred from IMDS metadata
     */
    clusterVpcId?: string;

    /**
     * AWS Account ID when running controller outside the cluster
     * @default Inferred from IMDS metadata
     */
    awsAccountId?: string;

    /**
     * AWS Region for VPC Lattice Service endpoint
     * @default Inferred from IMDS metadata
     */
    region?: string;

    /**
     * Log level configuration
     * @default "info"
     */
    logLevel?: 'info' | 'debug';

    /**
     * Default service network name
     * @default ""
     */
    defaultServiceNetwork?: string;

    /**
     * Enable single service network mode
     * @default "false"
     */
    enableServiceNetworkOverride?: boolean;

    /**
     * Enable webhook listener for pod readiness gate injection
     * @default "false"
     */
    webhookEnabled?: boolean;

    /**
     * Disable AWS Resource Groups Tagging API
     * @default "false"
     */
    disableTaggingServiceApi?: boolean;

    /**
     * Maximum number of concurrent reconcile loops per route type
     * @default 1
     */
    routeMaxConcurrentReconciles?: number;
}

const defaultProps: AwsGatewayApiControllerAddOnProps = {
    name: 'aws-gateway-api-controller',
    namespace: 'aws-application-networking-system',
    chart: 'aws-gateway-controller-chart',
    version: 'v1.1.0',
    repository: 'oci://public.ecr.aws/aws-application-networking-k8s/aws-gateway-controller-chart',
    values: {},
    defaultServiceNetwork: '',
    enableServiceNetworkOverride: false,
    webhookEnabled: false,
    disableTaggingServiceApi: false,
    routeMaxConcurrentReconciles: 1,
};

export class AwsGatewayApiControllerAddOn extends HelmAddOn {
    readonly options: AwsGatewayApiControllerAddOnProps;

    constructor(props?: AwsGatewayApiControllerAddOnProps) {
        super({ ...(defaultProps as any), ...props });
        this.options = this.props as AwsGatewayApiControllerAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        // Step 1: Configure Security Groups for VPC Lattice 
        const sgCustomResource = this.configureSecurityGroup(clusterInfo);

        // Step 2: Create namespace
        const namespace = this.createNamespace(clusterInfo);

        // Step 3: Set up IAM permissions
        const serviceAccount = this.setupIamPermissions(clusterInfo);

        // Step 4: Deploy the controller
        const chartValues = this.populateValues(serviceAccount);
        const awsGatewayApiController = this.addHelmChart(clusterInfo, chartValues);

        // Step 5: Create SIG-Network official K8s Gateway API
        const crdsStack = new GatewayApiCrdsStack(
            clusterInfo.cluster.stack,
            'sig-gateway-api-crds',
            clusterInfo.cluster
        );

        // Step 6: Create GatewayClass that uses the official K8s Gateway API
        const gatewayClass = this.createGatewayClass(clusterInfo);

        // Set up dependencies:
        serviceAccount.node.addDependency(namespace);
        awsGatewayApiController.node.addDependency(serviceAccount);
        gatewayClass.node.addDependency(crdsStack);
        sgCustomResource.node.addDependency(awsGatewayApiController);
        sgCustomResource.node.addDependency(gatewayClass);

        return Promise.resolve(awsGatewayApiController);
    }

    /** 
     * CDK does not provide native way to get managed prefix list as of 3/11/2025
     * PR seems to be almost done: https://github.com/aws/aws-cdk/pull/33619
     * Using CRD workaround as described here for now: https://gist.github.com/bericp1/eb0ce72079161f45f4867a9e3ab02bd9
     * */ 
    private configureSecurityGroup(clusterInfo: ClusterInfo) {
        const clusterSg = clusterInfo.cluster.clusterSecurityGroup;
        const region = Stack.of(clusterInfo.cluster).region;

        // Create the prefix list lookup custom resource
        const vpcLatticePrefixListCall = new customResources.AwsCustomResource(clusterInfo.cluster.stack, 'GetVpcLatticePrefixListIDs', {
            resourceType: 'Custom::GetVpcLatticePrefixListIDs',
            onUpdate: {
                region,
                service: 'EC2',
                action: 'describeManagedPrefixLists',
                parameters: {
                    Filters: [
                        {
                            Name: 'prefix-list-name',
                            Values: [
                                `com.amazonaws.${region}.vpc-lattice`,
                                `com.amazonaws.${region}.ipv6.vpc-lattice`
                            ],
                        },
                    ],
                },
                physicalResourceId: customResources.PhysicalResourceId.of('GetVpcLatticePrefixListIDsFunction')
            },
            policy: customResources.AwsCustomResourcePolicy.fromSdkCalls({
                resources: customResources.AwsCustomResourcePolicy.ANY_RESOURCE
            })
        });

        // Get the prefix list IDs from the custom resource response
        const prefixListIds = [
            vpcLatticePrefixListCall.getResponseField('PrefixLists.0.PrefixListId'),
            vpcLatticePrefixListCall.getResponseField('PrefixLists.1.PrefixListId'),
        ];

        // Add security group rules for each prefix list
        prefixListIds.forEach(prefixListId => {
            // Add ingress rule
            clusterSg.addIngressRule(
                ec2.Peer.prefixList(prefixListId.toString()),
                ec2.Port.allTraffic(),
                'Allow inbound from VPC Lattice'
            );

            // Add egress rule
            clusterSg.addEgressRule(
                ec2.Peer.prefixList(prefixListId.toString()),
                ec2.Port.allTraffic(),
                'Allow outbound to VPC Lattice'
            );
        });

        return vpcLatticePrefixListCall;
    }


    // https://github.com/aws/aws-application-networking-k8s/blob/main/files/controller-installation/deploy-namesystem.yaml
    private createNamespace(clusterInfo: ClusterInfo): Construct {
        return clusterInfo.cluster.addManifest('aws-application-networking-system-namespace', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: this.options.namespace,
                labels: {
                    'control-plane': 'gateway-api-controller'
                }
            }
        });
    }

    // https://github.com/aws/aws-application-networking-k8s/blob/main/files/controller-installation/recommended-inline-policy.json
    private setupIamPermissions(clusterInfo: ClusterInfo) {
        const cluster = clusterInfo.cluster;

        const serviceAccount = cluster.addServiceAccount(AWS_GATEWAY_API_CONTROLLER_SA, {
            name: AWS_GATEWAY_API_CONTROLLER_SA,
            namespace: this.options.namespace,
        });

        getVpcLatticeControllerPolicy().forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(statement);
        });

        return serviceAccount;
    }

    // Sets Helm and AWS Gateway API Controller Configuration 
    // https://www.gateway-api-controller.eks.aws.dev/latest/guides/environment/
    private populateValues(serviceAccount: ServiceAccount): Values {
        const values = this.options.values ?? {};
        values.serviceAccount = {
            create: false,
            name: serviceAccount.serviceAccountName
        };

        if (this.options.clusterName) {
            values.clusterName = this.options.clusterName;
        }

        if (this.options.clusterVpcId) {
            values.clusterVpcId = this.options.clusterVpcId;
        }

        if (this.options.awsAccountId) {
            values.awsAccountId = this.options.awsAccountId;
        }

        if (this.options.region) {
            values.region = this.options.region;
        }

        if (this.options.logLevel) {
            values.logLevel = this.options.logLevel;
        }

        if (this.options.defaultServiceNetwork) {
            values.defaultServiceNetwork = this.options.defaultServiceNetwork;
        }

        if (this.options.enableServiceNetworkOverride) {
            values.enableServiceNetworkOverride = this.options.enableServiceNetworkOverride;
        }

        if (this.options.webhookEnabled) {
            values.webhookEnabled = this.options.webhookEnabled;
        }

        if (this.options.disableTaggingServiceApi) {
            values.disableTaggingServiceApi = this.options.disableTaggingServiceApi;
        }

        if (this.options.routeMaxConcurrentReconciles) {
            values.routeMaxConcurrentReconciles = this.options.routeMaxConcurrentReconciles;
        }

        return values;
    }

    // https://github.com/aws/aws-application-networking-k8s/blob/main/files/controller-installation/gatewayclass.yaml
    private createGatewayClass(clusterInfo: ClusterInfo): Construct {
        return clusterInfo.cluster.addManifest('vpc-lattice-gateway-class', {
            apiVersion: 'gateway.networking.k8s.io/v1beta1',
            kind: 'GatewayClass',
            metadata: {
                name: 'amazon-vpc-lattice'
            },
            spec: {
                controllerName: 'application-networking.k8s.aws/gateway-api-controller'
            }
        });
    }
}
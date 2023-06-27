import { ClusterInfo, ClusterProvider } from "../spi";
import { selectKubectlLayer } from "./generic-cluster-provider";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import { Role } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import * as sdk from "@aws-sdk/client-eks";
import { Construct } from "constructs";
import { getResource } from "../resource-providers/utils";
import { LookupOpenIdConnectProvider, LookupRoleProvider } from "../resource-providers";
import { logger } from "../utils";


/**
 * Properties object for the ImportClusterProvider.
 */
export interface ImportClusterProviderProps extends Omit<eks.ClusterAttributes, "vpc"> {
    /**
     * This property is needed as it drives selection of certain add-on versions as well as kubectl layer. 
     */
    version: eks.KubernetesVersion;
}

/**
 * Importing cluster into the blueprint enabling limited blueprinting capabilities such as adding certain addons, 
 * teams.
 */
export class ImportClusterProvider implements ClusterProvider {

    constructor(private readonly props: ImportClusterProviderProps) { }

    /**
     * Implements contract method to create a cluster, by importing an existing cluster.
     * @param scope 
     * @param vpc 
     * @param _secretsEncryptionKey 
     * @returns 
     */
    createCluster(scope: Construct, vpc: IVpc, _secretsEncryptionKey?: IKey | undefined): ClusterInfo {
        const props = { ...this.props, vpc };

        if(! props.kubectlLayer) {
            props.kubectlLayer = selectKubectlLayer(scope, props.version);
        }
        
        const existingCluster = eks.Cluster.fromClusterAttributes(scope, 'imported-cluster-' + this.props.clusterName, props);
        return new ClusterInfo(existingCluster, this.props.version);
    }


    /**
     * Requires iam permission to eks.DescribeCluster at build time. Retrieves the cluster information using DescribeCluster api and
     * creates an import cluster provider. 
     * @param clusterName name of the cluster
     * @param region target rego
     * @param version version of the cluster to be imported
     * @param kubectlRole iam Role that provides access to the cluster API (kubectl). The CDK custom resource should be able to assume the role
     * which in some cases may require trust policy for the account root principal.
     * @returns the cluster provider with the import cluster configuration
     */
    public static async fromClusterLookup(clusterName: string, region: string, version: eks.KubernetesVersion, kubectlRole: Role) : 
        Promise<ClusterProvider> {

        const sdkCluster = await getCluster(clusterName, process.env.CDK_DEFAULT_REGION!);

        return new ImportClusterProvider({
            clusterName,
            version: version,
            clusterEndpoint: sdkCluster.endpoint,
            openIdConnectProvider: getResource(context =>
                new LookupOpenIdConnectProvider(sdkCluster.identity!.oidc!.issuer!).provide(context)),
            clusterCertificateAuthorityData: sdkCluster.certificateAuthority?.data,
            kubectlRoleArn: getResource(context =>
                new LookupRoleProvider('awsqs-kubernetes-helm').provide(context)).roleArn,
        });
    }
}

/**
 * Wraps API call to get the data on the eks.Cluster. 
 * @param clusterName 
 * @param region 
 * @returns 
 */
export async function getCluster(clusterName: string, region: string): Promise<sdk.Cluster> {
    const client = new sdk.EKSClient({ region: process.env.CDK_DEFAULT_REGION });
    const input: sdk.DescribeClusterRequest = {
        name: clusterName
    };

    const command = new sdk.DescribeClusterCommand(input);
    try {
        const response = await client.send(command);
        return response.cluster!;
    }
    catch (error) {
        logger.error(error);
        throw error;
    }
}
import { ClusterInfo, ClusterProvider, selectKubectlLayer } from "../";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib//aws-eks";
import { IKey } from "aws-cdk-lib/aws-kms";
import { Construct } from "constructs";


export interface ImportClusterProviderProps extends Omit<eks.ClusterAttributes, "vpc"> {
    /**
     * This property is needed as it drives selection of certain add-on versions as well as kubectl layer. 
     */
    version: eks.KubernetesVersion;
}

export class ImportClusterProvider implements ClusterProvider {

    constructor(private readonly props: ImportClusterProviderProps) { }

    createCluster(scope: Construct, vpc: IVpc, _secretsEncryptionKey?: IKey | undefined): ClusterInfo {
        const props = { ...this.props, vpc };

        if(! props.kubectlLayer) {
            props.kubectlLayer = selectKubectlLayer(scope, props.version);
        }
        
        const existingCluster = eks.Cluster.fromClusterAttributes(scope, 'imported-cluster-' + this.props.clusterName, props);
        return new ClusterInfo(existingCluster, this.props.version);
    }
}
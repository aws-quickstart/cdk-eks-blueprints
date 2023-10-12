import { ClusterInfo } from '.';
import { Construct } from "constructs";
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import {IKey} from "aws-cdk-lib/aws-kms";
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';


/**
 * ClusterProvider is the interface to which all Cluster Providers should conform.
 */
export declare interface ClusterProvider {
    createCluster(scope: Construct, vpc: IVpc, secretsEncryptionKey?: IKey, kubernetesVersion?: KubernetesVersion): ClusterInfo;
}


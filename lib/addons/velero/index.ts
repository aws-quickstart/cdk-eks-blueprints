import { KubernetesManifest, ServiceAccount } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import merge from "ts-deepmerge";
import { ClusterInfo } from "../../spi";
import { createNamespace } from "../../utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";

/**
 * Configuration options for the add-on.
 */
export interface VeleroAddOnProps extends HelmAddOnUserProps {    
    createNamespace: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    name: 'velero',
    version: "3.1.5",
    namespace: "velero",
    createNamespace: true,
    chart: "velero",
    repository: "https://vmware-tanzu.github.io/helm-charts/",
    release: "blueprints-addon-velero",
    values:{
        initContainers:[
            {
                name: "velero-plugin-for-aws",
                image: "velero/velero-plugin-for-aws:v1.2.0",
                imagePullPolicy: "IfNotPresent",
                volumeMounts:[
                    {
                        mountPath: "/target",
                        name: "plugins"
                    }
                ]
            }
        ],
        configuration: {
            provider: "aws",
            backupStorageLocation:{
                name: "default",
                config:{}
            },
            volumeSnapshotLocation:{
                name: "default",
                config:{}
            },
        },
        serviceAccount: {
            server:{}
        }
    },
};

export class VeleroAddOn extends HelmAddOn {

    private options: Required<VeleroAddOnProps>;

    constructor(props?: VeleroAddOnProps) {
        super(merge(defaultProps, props ?? {}));
        this.options = this.props as Required<VeleroAddOnProps>;
    }

    /**
     * Implementation of the add-on contract deploy method.
    */
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const props = this.options;
               
        // Create S3 bucket if no existing bucket, create s3 bucket and corresponding KMS key
        const s3Bucket = this.getOrCreateS3Bucket(clusterInfo, "backup-bucket", props.values.configuration.backupStorageLocation.bucket);

        // Create Namespace if namespace is not explicied defined.
        const veleroNamespace = this.createNamespaceIfNeeded(clusterInfo, "velero", props.namespace, props.createNamespace);

        // Setup IAM Role for Service Accounts (IRSA) for the Velero Service Account    
        const veleroServiceAccount = this.createServiceAccountWithIamRoles(clusterInfo, "velero-account", veleroNamespace.name, s3Bucket);
        
        // if veleroName space does not exist and needs creation, add the dependency
        if (veleroNamespace.manifest) {
            veleroServiceAccount.node.addDependency(veleroNamespace.manifest);
        }
        
        // Setup the values for the helm chart
        const valueVariable = {
            values: {
                configuration: {
                    backupStorageLocation: {
                        prefix: props.values!.configuration.backupStorageLocation.prefix ?? "velero/" + cluster.clusterName,
                        bucket: s3Bucket.bucketName,
                        config:{
                           region: props.values!.configuration.backupStorageLocation.config.region ?? cluster.stack.region,
                        }
                    },
                    volumeSnapshotLocation:{
                        config:{
                            region: props.values!.configuration.backupStorageLocation.config.region ?? cluster.stack.region
                        }
                    }
                },
                // IAM role for Service Account
                serviceAccount: {
                    server: {
                        create: false,
                        name: veleroServiceAccount.serviceAccountName,    
                    }
                }             
            }
        };

        const values = merge(props.values!, valueVariable.values) ?? {}; 
 
        const chartNode = this.addHelmChart(clusterInfo, values);
        chartNode.node.addDependency(veleroServiceAccount);
        return Promise.resolve(chartNode);
    }

    /**
     * Return S3 Bucket
     * @param clusterInfo 
     * @param id S3-Bucket-Postfix 
     * @param existingBucketName exiting provided S3 BucketName if it exists 
     * @returns the existing provided S3 bucket  or the newly created S3 bucket as s3.IBucket
     */
    protected getOrCreateS3Bucket(clusterInfo: ClusterInfo, id: string, existingBucketName: null|string ): s3.IBucket {
        if (!existingBucketName){
            const bucket = new s3.Bucket(clusterInfo.cluster, "velero-${id}", {
                encryption: s3.BucketEncryption.KMS_MANAGED, // Velero Known bug for support with S3 with SSE-KMS with CMK, thus it does not support S3 Bucket Key: https://github.com/vmware-tanzu/helm-charts/issues/83
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block Public Access for S3
                publicReadAccess: false,
                enforceSSL: true // Encryption in Transit
            });
            return s3.Bucket.fromBucketName(clusterInfo.cluster, 'getOrCreateS3Bucket', bucket.bucketName );
        }
        else {
            return s3.Bucket.fromBucketName(clusterInfo.cluster, 'getOrCreateS3Bucket', existingBucketName );
        }
    }

    /**
     * Return Velero Namespace where Velero will be installed onto
     * @param clusterInfo
     * @param defaultName the Default Namespace for Velero if nothing specified 
     * @param namespace
     * @returns the namespace created or existed.
     */
    protected createNamespaceIfNeeded(clusterInfo: ClusterInfo, defaultName: string, namespace: string, create: boolean): {name: string, manifest?: KubernetesManifest} {
        // Create Namespace if namespace is not explicied defined.
        if (namespace){
            // Create Namespace if the "create" option is true
            if (create) {
                const namespaceManifest = createNamespace(namespace, clusterInfo.cluster);
                return { name: namespace, manifest: namespaceManifest };
            }
            // If the "create" option if false, then namespace will not be created, return namespace.name
            else{
                return { name: namespace };
            }
        }
        else{
            return { name: defaultName }; // initial value of veleroNamespace
        }
    }

    /**
     * Return Velero Namespace where Velero will be installed onto
     * @param clusterInfo
     * @param id
     * @param namespace Velero namespace name
     * @param s3BucketName the S3 BucketName where Velero will stores the backup onto
     * @returns the service Account
     */
    protected createServiceAccountWithIamRoles(clusterInfo: ClusterInfo, id: string, namespace: string, s3Bucket: s3.IBucket): ServiceAccount {
        // Setup IAM Role for Service Accounts (IRSA) for the Velero Service Account
        const veleroServiceAccount = clusterInfo.cluster.addServiceAccount (
            id,
            {
                name: id,
                namespace: namespace
            }
        );

        // IAM policy for Velero
        const veleroPolicyDocument = {
            "Version": "2012-10-17",
            "Statement": [
              {
                  "Effect": "Allow",
                  "Action": [
                      "ec2:DescribeVolumes",
                      "ec2:DescribeSnapshots",
                      "ec2:CreateTags",
                      "ec2:CreateVolume",
                      "ec2:CreateSnapshot",
                      "ec2:DeleteSnapshot"
                  ],
                  "Resource": "*"
              },
              {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:DeleteObject",
                    "s3:PutObject",
                    "s3:AbortMultipartUpload",
                    "s3:ListMultipartUploadParts",
                    "s3:ListBucket"
                ],
                "Resource": [
                    s3Bucket.arnForObjects("*"),
                    s3Bucket.bucketArn                   
                ]
              }
            ]
        };

        const veleroCustomPolicyDocument = iam.PolicyDocument.fromJson(veleroPolicyDocument);
        const veleroPolicy = new iam.ManagedPolicy(clusterInfo.cluster, "velero-managed-policy", {
            document: veleroCustomPolicyDocument
        });
        veleroServiceAccount.role.addManagedPolicy(veleroPolicy);
        return veleroServiceAccount;
    }
}
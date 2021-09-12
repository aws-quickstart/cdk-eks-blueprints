import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Constants } from "..";
import * as s3 from "@aws-cdk/aws-s3";
import * as kms from "@aws-cdk/aws-kms";
import * as iam from "@aws-cdk/aws-iam";
import { createNamespace } from "../../utils";
import { Bucket } from "@aws-cdk/aws-s3";


/**
 * Configuration options for the add-on.
 */
export interface VeleroAddOnProps {
    /**
     * Velero for the Velero Helm Chart.
     * @default 2.23.6
     */
    version?: string;

    /**
     * Velero requires AWS S3 bucket as the storage location. This option is checking whether an existing S3 bucket is provided
     * @default ''
     */
     existingS3BucketName?: string;

    /**
     * Namespace for the add-on.
     * @default velero
     */
    namespace?: string;

    /**
     * Init containers to add to the Velero deployment's pod spec. At least one plugin provider image is required.
     * @default aws
     */
    initContainers?: Array<any>;

     /**
     * Values to pass to the chart as per https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml#
     */
    values: {
        [key: string]: any;
    };

}

/**
 * Defaults options for the add-on
 */
const defaultProps: VeleroAddOnProps = {
    version: "2.23.6",
    existingS3BucketName: '',
    namespace: "velero",
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
    values:{
        configuration: {
            provider: "aws",
            backupStorageLocation:{
                name: "default",
                bucket: "velero-backup-bucket",
            },
            volumeSnapshotLocation:{
                name: "default"
            }
        }
    },

};

export class VeleroAddOn implements ClusterAddOn {

    private options: VeleroAddOnProps;
    constructor(props?: VeleroAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        
        const cluster = clusterInfo.cluster;
        const props = this.options;
        const bucket:s3.Bucket;

        // Create S3 bucket if no existing bucket, create s3 bucket
        if ( !props.existingS3BucketName ){
             console.log("existing S3 Bucket does not exists, creating S3 bucket");
             bucket = new s3.Bucket(this, 'velero-backup-bucket', {
                encryption: s3.BucketEncryption.KMS,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                versioned: true
            });      
            // you can access the encryption key:
            //assert(bucket.encryptionKey instanceof kms.Key);
        }
        
        // bucket.bucketName


        
        // Setup IAM Role for Service Accounts (IRSA)
        const veleroServiceAccount = cluster.addServiceAccount (
            'velero-account',
            {
                name: 'velero-account',
                namespace: props.namespace
            }
        );

        // Velero Namespace
        const veleroNamespace = createNamespace(props.namespace ?? 'velero', cluster);

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
                    "s3:ListMultipartUploadParts"
                ],
                "Resource": [
                    "arn:aws:s3:::velero-*/*"
                ]
              },
              {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [
                    "arn:aws:s3:::velero-*"
                ]
              }
            ]
        };

       const veleroCustomPolicyDocument = iam.PolicyDocument.fromJson(veleroPolicyDocument);
       // Xin how to address this ?
       const veleroPolicy = new iam.ManagedPolicy(this, "velero-managed-policy", {
           document: veleroCustomPolicyDocument
       });
       veleroServiceAccount.role.addManagedPolicy(veleroPolicy);
       veleroServiceAccount.node.addDependency(veleroNamespace);

        const regionVaraible:VeleroAddOnProps = {
            values: {
                configuration: {
                    backupStorageLocation: {
                        prefix: props.values.configuration.backupStorageLocation.prefix ?? "velero/" + cluster.clusterName,
                        bucket: props.existingS3BucketName ?? props.values.configuration.backupStorageLocation.bucket,
                        config:{
                            region: props.values.configuration.backupStorageLocation.config.region ?? cluster.stack.region,

                        }
                    },
                    volumeSnapshotLocation:{
                        config:{
                            region: props.values.configuration.volumeSnapshotLocation.config ?? cluster.stack.region
                        }
                    }
                },
                serviceAccount: {
                    server: {
                        create: false,
                        name: veleroServiceAccount.serviceAccountName,

                    }
                }             
            }
        };
        const values = { ...props.values, ...regionVaraible } ?? {};

        clusterInfo.cluster.addHelmChart("velero-addon", {
            chart: "velero",
            repository: "https://vmware-tanzu.github.io/helm-charts/",
            release: Constants.SSP_ADDON,
            namespace: props.namespace,
            version: props.version,
            values
        });


    }
}
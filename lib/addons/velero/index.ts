import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Constants } from "..";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import * as kms from "@aws-cdk/aws-kms";
import deepmerge = require('deepmerge');
import { GatewayVpcEndpointAwsService } from "@aws-cdk/aws-ec2";


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
     * Namespace for the add-on. If the namespace does not exist, specify create to false
     * @default {namespace: 'velero', create: true}
     */
    namespace?:  {
        [key: string]: any;
    };

     /**
     * Values to pass to the chart as per https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml#
     * Required if provided.
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
    namespace: {
        name: 'velero',
        create: true
    },
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

export class VeleroAddOn implements ClusterAddOn {

    private options: VeleroAddOnProps;
    constructor(props?: VeleroAddOnProps) {
        if (props) {
            this.options = deepmerge(defaultProps, props);
        }
        else {
            this.options = defaultProps
        }
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        const props = this.options;
        
        let bucketName: string;
        let veleroNamespace: string;
        let kmsKeyId: null|string;
       
        // Create S3 bucket if no existing bucket, create s3 bucket
        if ( !props.values.configuration.backupStorageLocation.bucket ){
             console.log("existing S3 Bucket does not exists, creating S3 bucket");
             const s3Key = new kms.Key(cluster, 'velero-backup-bucket-s3CMK',{
                 enableKeyRotation: true,
             });
             const bucket = new s3.Bucket(cluster, 'velero-backup-bucket', {
                encryption: s3.BucketEncryption.KMS,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                publicReadAccess: false,
                encryptionKey: s3Key,
                versioned: true,
                //lifecycleRules:[{
                //    expiration: Duration.days(365),
                //    transitions:[{
                //        storageClass:StorageClass.INFREQUENT_ACCESS,
                //        transitionAfter: Duration.days(30)
                //    }
                //]
                //}]
            });
            // Create S3 VPC Endpoint
            cluster.vpc.addGatewayEndpoint('velero-backup-bucket-vpcEndPoint', {
                service: GatewayVpcEndpointAwsService.S3
            })
            bucket.addToResourcePolicy(
                new iam.PolicyStatement({
                    sid: 'ForceCMKAtUpload',
                    effect: iam.Effect.DENY,
                    actions:['s3:PutObject'],
                    resources: [bucket.arnForObjects('*')],
                    principals: [new iam.AnyPrincipal()],
                    conditions: {
                        StringNotEquals: {
                            's3:x-amz-server-side-encryption-aws-kms-key-id': bucket.encryptionKey?.keyArn
                        },
                    },
                }),
            );
            //bucket.addToResourcePolicy(
            //    new iam.PolicyStatement({
            //        sid: 'DenyHTTPTraffic',
            //        effect: iam.Effect.DENY,
            //        actions: ['s3:*'],
            //        resources: [bucket.arnForObjects('*')],
            //        principals: [new iam.AnyPrincipal()],
            //        conditions:{
            //            Bool:{
            //                'aws:SecureTransport': 'false',
            //            }
            //        }
            //    })
            //)
            bucketName = bucket.bucketName
            kmsKeyId = s3Key.keyId;
        }
        else {
            bucketName = props.values.configuration.backupStorageLocation.bucket
            kmsKeyId = props.values.configuration.backupStorageLocation.config.kmsKeyId ?? {}
        }

        // Create Namespace if not specified
        if (props.namespace){
            if (props.namespace.create) {
                console.log ("namespace:" + props.namespace.name + " does not existed, creating")
                cluster.addManifest('velero-namespace',
                {
                    apiVersion: 'v1',
                    kind: 'Namespace',
                    metadata: { 
                        name: props.namespace.name
                    }
                }
                )
                veleroNamespace = props.namespace.name;
            }
            else{
                console.log ("namespace:" + props.namespace.name + " exists, not creating new namespace")
                veleroNamespace = props.namespace.name;
            }
        }
        else{
            veleroNamespace = 'velero'; // initial value of veleroNamespace
        }

        // Setup IAM Role for Service Accounts (IRSA)
        const veleroServiceAccount = cluster.addServiceAccount (
            'velero-account',
            {
                name: 'velero-account',
                namespace: veleroNamespace
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
                    "s3:ListMultipartUploadParts"
                ],
                "Resource": "*"
              },
              {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": "*"
              },
              {
                "Effect": "Allow",
                "Action": [
                    "kms:*"
                ],
                "Resource": "*"                  
              },
              {
                  "Effect": "Allow",
                  "Action":[
                      "ec2:*VpcEndpoint*"
                  ],
                  "Resource": "*"
              }
            ]
        };

        const veleroCustomPolicyDocument = iam.PolicyDocument.fromJson(veleroPolicyDocument);
        const veleroPolicy = new iam.ManagedPolicy(cluster, "velero-managed-policy", {
            document: veleroCustomPolicyDocument
        });
        veleroServiceAccount.role.addManagedPolicy(veleroPolicy);

        
        //const values:VeleroAddOnProps["values"] = props.values

        const valueVariable:VeleroAddOnProps = {
            values: {
                configuration: {
                    backupStorageLocation: {
                        prefix: props.values.configuration.backupStorageLocation.prefix ?? "velero/" + cluster.clusterName,
                        bucket: bucketName,
                        config:{
                           region: props.values.configuration.backupStorageLocation.config.region ?? cluster.stack.region,
                           kmsKeyId: kmsKeyId ?? {}
                        }
                    },
                    volumeSnapshotLocation:{
                        config:{
                            region: props.values.configuration.backupStorageLocation.config.region ?? cluster.stack.region
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

        const values = deepmerge(props.values, valueVariable.values) ?? {}; 
 
        cluster.addHelmChart("velero-addon", {
            chart: "velero",
            repository: "https://vmware-tanzu.github.io/helm-charts/",
            release: Constants.SSP_ADDON,
            namespace: veleroNamespace,
            version: props.version,
            values: values
        });
    }
}
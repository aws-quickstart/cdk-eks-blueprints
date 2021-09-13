import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Constants } from "..";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";


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
     * Velero requires AWS S3 bucket as the storage location. This option is to specify which region the s3Bucket will be created
     * Optional
     */
     s3BucketRegion?: string;    

    /**
     * Namespace for the add-on. If the namespace does not exist, specify create to false
     * @default {namespace: 'velero', create: true}
     */
    namespace?:  {
        [key: string]: any;
    };

    /**
     * Init containers to add to the Velero deployment's pod spec. At least one plugin provider image is required.
     * @default aws
     */
    initContainers?: Array<any>;

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
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        const props = this.options;

        let bucketName: string;
        let veleroNamespace = 'velero'; // initial value of veleroNamespace

        // Create S3 bucket if no existing bucket, create s3 bucket
        if ( !props.existingS3BucketName ){
             console.log("existing S3 Bucket does not exists, creating S3 bucket");
             const bucket = new s3.Bucket(cluster, 'velero-backup-bucket', {
                encryption: s3.BucketEncryption.KMS,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                versioned: true,
            });
            bucketName = bucket.bucketName
        }
        else {
            bucketName = props.existingS3BucketName
        }

        // Create Namespace
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
        const veleroPolicy = new iam.ManagedPolicy(cluster, "velero-managed-policy", {
            document: veleroCustomPolicyDocument
        });
        veleroServiceAccount.role.addManagedPolicy(veleroPolicy);
   
        const values:VeleroAddOnProps["values"] = props.values
        /*************************************************  
         * Assigning below values to valueVariable
        {
            values: {
                configuration: {
                    backupStorageLocation: {
                        prefix: props.values.configuration.backupStorageLocation.prefix ?? "velero/" + cluster.clusterName,
                        bucket: bucketName,
                        config:{
                           region: props.s3BucketRegion ?? cluster.stack.region,
                        }
                    },
                    volumeSnapshotLocation:{
                        config:{
                            region: props.s3BucketRegion ?? cluster.stack.region
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
        ******************************************************************************************************************************/
        values["configuration"]["backupStorageLocation"]["prefix"] = props.values.configuration.backupStorageLocation.prefix ?? "velero/" + cluster.clusterName;
        values["configuration"]["backupStorageLocation"]["bucket"] = bucketName;
        values["configuration"]["backupStorageLocation"]["config"]["region"] = props.s3BucketRegion ?? cluster.stack.region;
        values["configuration"]["volumeSnapshotLocation"]["config"]["region"] = props.s3BucketRegion ?? cluster.stack.region;
        values["serviceAccount"]["server"]["create"] = false;
        values["serviceAccount"]["server"]["name"] = veleroServiceAccount.serviceAccountName;

        //const values = { ...props.values, ...valueVaraible.values } ?? {}; //
 
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
import { Construct } from "constructs";
import * as assert from "assert";

import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';

import { HelmAddOnUserProps } from "../helm-addon";
import { HelmAddOn } from '../helm-addon/index';
import { AwsLoadBalancerControllerAddOn } from "../aws-loadbalancer-controller";
import { EfsCsiDriverAddOn } from "../efs-csi-driver";

import { ClusterInfo } from '../../spi/types';
import { Values } from "../../spi";
import { setPath, createNamespace, createServiceAccount, supportsX86 } from "../../utils";
import { IFileSystem } from "aws-cdk-lib/aws-efs";

import { merge } from "ts-deepmerge";

/**
 * User provided options for the Helm Chart
 */
export interface AirflowAddOnProps extends HelmAddOnUserProps {
    /**
     * Namespace
     */
    namespace?: string,
    
    /**
     * Enable Load Balancer for Ingress - default is false
     */
    enableAlb?: boolean,

    /**
     * Name of the {@link certificateResourceName} to be used for certificate look up. 
     * @see {@link ImportCertificateProvider} and {@link CreateCertificateProvider} for examples of certificate providers.
     */
    certificateResourceName?: string,

    /**
     * Enable Logging with S3  - default is false
     */
    enableLogging?: boolean,

    /**
     * Names of the S3 Bucket provider named resources (@see CreateS3BucketProvider, @see ImportS3BucketProvider).
     * S3 Bucket provider is registered as named resource providers with the EksBlueprintProps.
     */
    s3Bucket?: string,

    /**
     * Enable EFS for persistent storage of DAGs - default is false
     */
    enableEfs?: boolean,

    /**
     * Names of the EFS File System provider named resources (@see CreateEfsFileSystemProvider, @see LookupEfsFileSystemProvider).
     * EFS File System provider is registered as named resource providers with the EksBlueprintProps.
     * This is required if EFS is enabled
     */
    efsFileSystem?: string,
}

const AIRFLOW = 'airflow';
const RELEASE = 'blueprints-addon-apache-airflow';
const AIRFLOWSC = 'apache-airflow-sc';
const AIRFLOWPVC = 'efs-apache-airflow-pvc';

/**
 * Default props to be used when creating the Helm chart
 */
 const defaultProps: AirflowAddOnProps = {
    name: AIRFLOW,
    namespace: AIRFLOW,
    chart: AIRFLOW,
    version: "1.15.0",
    release: RELEASE,
    repository:  "https://airflow.apache.org",
    enableAlb: false,
    enableEfs: false,
    enableLogging: false,
    values: {}
};

/**
 * This add-on is currently not supported. It will apply the latest falco helm chart but the latest AMI does not have stock driver supported and
 * driver build in the init fails atm. 
 */
@supportsX86
export class ApacheAirflowAddOn extends HelmAddOn {

    readonly options: AirflowAddOnProps;

    constructor(props?: AirflowAddOnProps) {
        super({...defaultProps  as any, ...props});
        this.options = this.props as AirflowAddOnProps;
    }
    
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        const albAddOnCheck = clusterInfo.getScheduledAddOn(AwsLoadBalancerControllerAddOn.name);
        const enableAlb = this.options.enableAlb;
        const cert = this.options.certificateResourceName;
        const loggingIsEnabled = this.options.enableLogging;
        const loggingBucketResourceName = this.options.s3Bucket;
        const efsIsEnabled = this.options.enableEfs;
        const efsResourceName = this.options.efsFileSystem;
        const namespace = this.options.namespace;

        // Create Namespace
        const ns = createNamespace(namespace!, cluster, true, true);

        // Setting basic custom values for Kubernetes
        let values: Values = {
            config: {
                "kubernetes": {
                    "namespace": this.options.namespace!
                },
                "kubernetes_executor": {
                    "namespace": this.options.namespace!
                }
            },
            "securityContext": {
                "fsGroup": 66534
            },
            "executor": "KubernetesExecutor"
        };

        // If Load Balancing is enabled
        if (enableAlb){
            values = setUpLoadBalancer(clusterInfo, values, albAddOnCheck, cert);
        } else {
            assert(!cert, 'Cert option is supported only if ALB is enabled.');
        }

        // If Logging with S3 is enabled
        if (loggingIsEnabled){
            const bucket = clusterInfo.getRequiredResource<IBucket>(loggingBucketResourceName!);
            values = setUpLogging(clusterInfo, values, ns, namespace!, bucket);
        }

        // If EFS is enabled for persistent storage
        let pvcResource: KubernetesManifest;
        if (efsIsEnabled){
            [values, pvcResource] = setUpEFS(clusterInfo, values, ns, namespace!, efsResourceName!);   
        }

        // Merge values with user-provided one
        values = merge(values, this.props.values ?? {});

        // Apply Helm Chart
        const chart = this.addHelmChart(clusterInfo, values, false, false);

        // Add PVC dependency to the Chart in case of EFS generating the resource
        if (efsIsEnabled){
            chart.node.addDependency(pvcResource!);
        }

        return Promise.resolve(chart);
    }
}

/**
 * Helper function to set up Load Balancer
 */
function setUpLoadBalancer(clusterInfo: ClusterInfo, values: Values, albAddOnCheck: Promise<Construct> | undefined, cert: string | undefined ): Values {
     // Check to ensure AWS Load Balancer Controller AddOn is provided in the list of Addons
     assert(albAddOnCheck, `Missing a dependency: ${AwsLoadBalancerControllerAddOn.name}. Please add it to your list of addons.`); 
     const presetAnnotations: any = {
         'alb.ingress.kubernetes.io/group.name': 'airflow',
         'alb.ingress.kubernetes.io/scheme': 'internet-facing',
         'alb.ingress.kubernetes.io/target-type': 'ip',
         'alb.ingress.kubernetes.io/listen-ports': '[{"HTTP": 80}]',
         'alb.ingress.kubernetes.io/healthcheck-path': '/health',
     };

     // Set helm custom value for certificates, if provided
     if (cert){
         presetAnnotations['alb.ingress.kubernetes.io/listen-ports'] = '[{"HTTP": 80},{"HTTPS":443}]';
         const certificate = clusterInfo.getResource<ICertificate>(cert);
         presetAnnotations['alb.ingress.kubernetes.io/certificate-arn'] = certificate?.certificateArn;
     } 
     
     setPath(values, "ingress.web", {
         "enabled": "true",
         "annotations": presetAnnotations,
         "pathType": "Prefix",
         "ingressClassName": "alb",
     });

     // Configuring Ingress for Airflow Web Ui hence the service type is changed to NodePort
     setPath(values, "webserver.service", {
         type: "NodePort",
         ports: [{
             name: "airflow-ui",
             port: "{{ .Values.ports.airflowUI }}"
         }]
     });

     return values;
}

/**
 * Helper function to set up Logging with S3 Bucket
*/
function setUpLogging(clusterInfo: ClusterInfo, values: Values, ns: KubernetesManifest, namespace: string, bucket: IBucket): Values {
    
    // Assert check to ensure you provide an S3 Bucket
    assert(bucket, "Please provide the name of S3 bucket for Logging.");

    // IRSA Policy
    const AirflowLoggingPolicy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:ListBucket"
                ],
                "Resource": [`arn:aws:s3:::${bucket.bucketName}`]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject"
                ],
                "Resource": [`arn:aws:s3:::${bucket.bucketName}/*`]
            }
        ]
    };

    // Set up IRSA
    const airflowLoggingPolicyDocument = PolicyDocument.fromJson(AirflowLoggingPolicy);
    const sa = createServiceAccount(clusterInfo.cluster, 'airflow-s3-logging-sa', namespace, airflowLoggingPolicyDocument);
    sa.node.addDependency(ns);

    // Helm custom value set up for S3 logging set up
    setPath(values, "config.core.colored_console_log", 'True');
    setPath(values, "config.core.remote_logging", 'True');
    setPath(values, "config.logging", {
        "remote_logging": 'True',
        "logging_level": 'INFO',
        "colored_console_log": 'True',
        "remote_base_log_folder": `s3://${bucket.bucketName}/airflow-logs`,
        // aws_s3_conn is the name of the connection that needs to be created using Airflow admin UI once the deployment is complete
        // Steps can be seen in the docs link here -> https://github.com/apache/airflow/issues/25322
        "remote_log_conn_id": 'aws_s3_conn',
        "delete_worker_pods": 'False',
        "encrypt_s3_logs": 'True'
    });

    // Set Webserver SA so that server logs can be shipped to S3
    setPath(values, "webserver.serviceAccount", {
        create: false,
        name: `${sa.serviceAccountName}`
    });

    // Set Worker SA so that worker logs can be shipped to S3
    setPath(values, "workers.serviceAccount", {
        create: false,
        name: `${sa.serviceAccountName}`
    });

    // Set Scheduler SA so that scheduler logs can be shipped to S3
    setPath(values, "scheduler.serviceAccount", {
        create: false,
        name: `${sa.serviceAccountName}`
    });
    
    return values;
}

/**
 * 
 */
function setUpEFS(clusterInfo: ClusterInfo, values: Values, ns: KubernetesManifest, namespace: string, efsResourceName: string): [Values, KubernetesManifest] {
    // Check 
    const efsAddOnCheck = clusterInfo.getScheduledAddOn(EfsCsiDriverAddOn.name);
    assert(efsAddOnCheck, `Missing a dependency: ${EfsCsiDriverAddOn.name}. Please add it to your list of addons.`); 
    const efs = clusterInfo.getRequiredResource<IFileSystem>(efsResourceName);
    assert(efs, "Please provide the name of EFS File System.");

    // Need to create a storage class and pvc for the EFS
    const scResource = new KubernetesManifest(clusterInfo.cluster, 'apache-airflow-efs-sc', {
        cluster: clusterInfo.cluster,
        manifest: [{
            apiVersion: "storage.k8s.io/v1",
            kind: "StorageClass",
            metadata: { name: AIRFLOWSC },
            provisioner: "efs.csi.aws.com",
            parameters: {
                provisioningMode: "efs-ap",
                fileSystemId: `${efs.fileSystemId}`,
                directoryPerms: "700",
                gidRangeStart: "1000",
                gidRangeEnd: "2000",
            }
        }], overwrite: true,
    });

    const pvcResource = new KubernetesManifest(clusterInfo.cluster, 'apache-airflow-efs-pvc',{
        cluster: clusterInfo.cluster,
        manifest: [{
            apiVersion: "v1",
            kind: "PersistentVolumeClaim",
            metadata: { 
                name: AIRFLOWPVC,
                namespace: `${namespace}` 
            },
            spec: {
                accessModes: ["ReadWriteMany"],
                storageClassName: AIRFLOWSC,
                resources: {
                    requests: {
                        storage: '10Gi'
                    }
                }
            }
        }], overwrite: true,
    });

    // SC depends on the EFS addon
    if(efsAddOnCheck) {
        efsAddOnCheck.then(construct => scResource.node.addDependency(construct));
    }

    // PVC depends on SC and NS
    pvcResource.node.addDependency(scResource);
    pvcResource.node.addDependency(ns);

    // Set helm custom values for persistent storage of DAGs
    setPath(values, "dags.persistence", {
        enabled: true,
        size: "10Gi",
        storageClassName: AIRFLOWSC,
        accessMode: "ReadWriteMany",
        existingClaim: AIRFLOWPVC
    });

    return [values, pvcResource];
}
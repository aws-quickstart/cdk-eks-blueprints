import { Construct } from "constructs";
import * as assert from "assert";

import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';

import { HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { HelmAddOn } from '../helm-addon/index';
import { AwsLoadBalancerControllerAddOn } from "../aws-loadbalancer-controller";
import { EfsCsiDriverAddOn } from "../efs-csi-driver";

import { ClusterInfo } from '../../spi/types';
import { Values } from "../../spi";
import { setPath, createNamespace, createServiceAccount } from "../../utils";
import { IFileSystem } from "aws-cdk-lib/aws-efs";

/**
 * User provided options for the Helm Chart
 */
export interface AirflowAddOnProps extends HelmAddOnUserProps {
    /**
     * Enable Load Balancer
     */
    enableAlb?: boolean,

    /**
     * Name of the {@link certificateResourceName} to be used for certificate look up. 
     * @see {@link ImportCertificateProvider} and {@link CreateCertificateProvider} for examples of certificate providers.
     */
    certificateResourceName?: string,

    /**
     * Names of the S3 Bucket provider named resources (@see CreateS3BucketProvider, @see ImportS3BucketProvider).
     * S3 Bucket provider is registered as named resource providers with the EksBlueprintProps.
     */
    s3Bucket?: string,

    /**
     * Enable EFS for persistent storage of DAGs
     */
    enableEfs?: boolean,

    /**
     * Names of the EFS File System provider named resources (@see CreateEfsFileSystemProvider, @see LookupEfsFileSystemProvider).
     * EFS File System provider is registered as named resource providers with the EksBlueprintProps.
     * This is required if EFS is enabled
     */
    efsFileSystem?: string,

    /**
     * TODO: Enable RDS
     */
    // enableRds?: boolean,

    /**
     * TODO: DB Configurations for RDS instance access - must have RDS enabled
     */
    // dbConfig?: {
    //     username: string,
    //     password: string,
    //     dbName: string 
    // }
    
    /**
     * Enable Logging with S3
     */
    enableLogging?: boolean,
}

const AIRFLOW = 'airflow';
const RELEASE = 'blueprints-addon-apache-airflow';

/**
 * Default props to be used when creating the Helm chart
 */
 const defaultProps: HelmAddOnProps = {
    name: AIRFLOW,
    namespace: AIRFLOW,
    chart: AIRFLOW,
    version: "1.9.0",
    release: RELEASE,
    repository:  "https://airflow.apache.org",
    values: {}
};

/**
 * This add-on is currently not supported. It will apply the latest falco helm chart but the latest AMI does not have stock driver supported and
 * driver build in the init fails atm. 
 */
export class ApacheAirflowAddOn extends HelmAddOn {

    readonly options: AirflowAddOnProps;

    constructor(props?: AirflowAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as AirflowAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;

        // Create Namespace
        const ns = createNamespace(this.options.namespace!, cluster, true, true);

        let values: Values = populateValues(clusterInfo, ns, this.options);

        const chart = this.addHelmChart(clusterInfo, values, false, false);

        return Promise.resolve(chart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(clusterInfo: ClusterInfo, ns: KubernetesManifest, helmOptions: AirflowAddOnProps): Values {
    let values = helmOptions.values ?? {};

    const albAddOnCheck = clusterInfo.getScheduledAddOn(AwsLoadBalancerControllerAddOn.name);
    const cert = helmOptions.certificateResourceName;
    // const dbConfig = helmOptions.dbConfig;

    // Kubernetes settings
    setPath(values, "config.kubernetes.namespace", helmOptions.namespace!);
    setPath(values, "config.kubernetes_executor.namespace", helmOptions.namespace!);

    // Security Context
    setPath(values, "securityContext.fsGroup", 66534);
    setPath(values, "executor", "KubernetesExecutor");

    // Load Balancer
    if (helmOptions.enableAlb){

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
        if (helmOptions.certificateResourceName){
            presetAnnotations['alb.ingress.kubernetes.io/listen-ports'] = '[{"HTTP": 80},{"HTTPS":443}]';
            const certificate = clusterInfo.getResource<ICertificate>(helmOptions.certificateResourceName);
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
        
    } else {
        assert(!cert, 'Cert option is supported only if ALB is enabled.');
    }

    // If Logging with S3 is enabled
    
    if (helmOptions.enableLogging){
        const bucket = clusterInfo.getRequiredResource<IBucket>(helmOptions.s3Bucket!);
        values = setUpLogging(clusterInfo, values, ns, helmOptions, bucket);
    }

    // If EFS is enabled for persistent storage
    if (helmOptions.enableEfs){
        const efsAddOnCheck = clusterInfo.getScheduledAddOn(EfsCsiDriverAddOn.name);
        assert(efsAddOnCheck, `Missing a dependency: ${EfsCsiDriverAddOn.name}. Please add it to your list of addons.`); 
        const efs = clusterInfo.getRequiredResource<IFileSystem>(helmOptions.efsFileSystem!);
        assert(efs, "Please provide the name of EFS File System.");

        // Set helm custom values for persistent storage of DAGs
        setPath(values, "dags.persistence", {
            enabled: true,
            size: "10Gi",
            storageClassName: "efs-sc",
            accessMode: "ReadWriteMany",
            existingClaim: ``
        });
    }

    // TODO: Using RDS as a Database
    // if (helmOptions.enableRds){
    //     values = setUpDatabase(values, dbConfig)
    // } else {
    //     assert(!dbConfig, 'DB Configuration is supported only if RDS is enabled.');
    // }

    return values;
}

/**
 * Helper function to set up Logging with S3 Bucket
*/
function setUpLogging(clusterInfo: ClusterInfo, values: Values, ns: KubernetesManifest, helmOptions: AirflowAddOnProps, bucket: IBucket): Values {
    
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
    const sa = createServiceAccount(clusterInfo.cluster, 'airflow-s3-logging-sa', helmOptions.namespace!, airflowLoggingPolicyDocument);
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
 * TODO: Helper function to set up the Metadata DB with RDS
*/
// function setUpDatabase(values: Values, dbConfig: {username: string; password: string; dbName: string;} | undefined): Values {
    
//     // Assert that the DB configurations are provided.
//     assert(dbConfig, 'Please provide DB Configurations for RDS');

//     // Set helm custom values
//     setPath(values, "data.metadataConnection", {
//         "user": dbConfig.username,
//         "pass": dbConfig.password,
//         "protocol": "postgresql",
//         "host": "",
//         "port": "5432",
//         "db": dbConfig.dbName,
//         "sslmode": "disable"
//     });

//     // Disabling local postgresql for RDS implementation
//     setPath(values, "postgresql.enabled", false);

//     return values
// }
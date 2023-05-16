import { HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { ClusterInfo } from '../../spi/types';
import { HelmAddOn } from '../helm-addon/index';
import { Construct } from "constructs";
import { setPath, createNamespace } from "../../utils";
import { Values } from "../../spi";
import * as assert from "assert";
import { AwsLoadBalancerControllerAddOn } from "../aws-loadbalancer-controller";
import { EfsCsiDriverAddOn } from "../efs-csi-driver";
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

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
     * Enable RDS
     */
    enableRds?: boolean,

    /**
     * DB Configurations for RDS instance access - must have RDS enabled
     */
    dbConfig?: {
        username: string,
        password: string,
        dbName: string 
    }
    
    /**
     * Enable Logging with S3
     */
    enableLogging?: boolean,

    /**
     * S3 bucket name for logging
     */
    s3BucketName?: string,

    /**
     * Enable EFS for persistent storage of DAGs
     */
    enableEfs?: boolean,

    /**
     * Name of the EFS File System - required if EFS is enabled
     */
    efsFileSystemName?: string,
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
export class AirflowAddOn extends HelmAddOn {

    readonly options: AirflowAddOnProps;

    constructor(props?: AirflowAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as AirflowAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;

        // Create Namespace
        createNamespace(this.options.namespace!, cluster, true, true);

        // Create SA
        // const sa = createServiceAccount(cluster, 'airflow-sa', ns, );

        let values: Values = populateValues(clusterInfo, this.options);
        // values.node.addDependency(ns);

        const chart = this.addHelmChart(clusterInfo, values, false, false);

        return Promise.resolve(chart);
    }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(clusterInfo: ClusterInfo, helmOptions: AirflowAddOnProps): Values {
    const values = helmOptions.values ?? {};

    const albAddOnCheck = clusterInfo.getScheduledAddOn(AwsLoadBalancerControllerAddOn.name);
    const cert = helmOptions.certificateResourceName;
    const dbConfig = helmOptions.dbConfig;
    const bucket = helmOptions.s3BucketName;
    const efs = helmOptions.efsFileSystemName;

    // Kubernetes settings
    setPath(values, "config.kubernetes.namespace", helmOptions.namespace!);
    setPath(values, "config.kubernetes_executor.namespace", helmOptions.namespace!);

    // Security Context
    setPath(values, "securityContext.fsGroup", 66534);
    setPath(values, "executor", "KubernetesExecutor");

    // Load Balancer
    if (helmOptions.enableAlb){
        assert(albAddOnCheck, `Missing a dependency: ${AwsLoadBalancerControllerAddOn.name}. Please add it to your list of addons.`); 
        const presetAnnotations: any = {
            'alb.ingress.kubernetes.io/group.name': 'airflow',
            'alb.ingress.kubernetes.io/scheme': 'internet-facing',
            'alb.ingress.kubernetes.io/target-type': 'ip',
            'alb.ingress.kubernetes.io/listen-ports': '[{"HTTP": 80}]',
            'alb.ingress.kubernetes.io/healthcheck-path': '/health',
        };
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
    } else {
        assert(!cert, 'Cert option is supported only if ALB is enabled.');
    }

    // Using RDS as a Database
    if (helmOptions.enableRds){
        assert(dbConfig, 'Please provide DB Configurations for RDS');
        setPath(values, "data.metadataConnection", {
            "user": dbConfig.username,
            "pass": dbConfig.password,
            "protocol": "postgresql",
            "host": "",
            "port": "5432",
            "db": dbConfig.dbName,
            "sslmode": "disable"
        });
        setPath(values, "postgresql.enabled", false);
    } else {
        assert(!dbConfig, 'DB Configuration is supported only if RDS is enabled.');
    }

    // If Logging with S3 is enabled
    if (helmOptions.enableLogging){
        assert(bucket, "Please provide the name of S3 bucket for Logging.");
        setPath(values, "config.core.colored_console_log", 'True');
        setPath(values, "config.core.remote_logging", 'True');
        setPath(values, "config.logging", {
            "remote_logging": 'True',
            "logging_level": 'INFO',
            "colored_console_log": 'True',
            "remote_base_log_folder": `s3://${bucket}/airflow-logs`,
            // aws_s3_conn is the name of the connection that needs to be created using Airflow admin UI once the deployment is complete
            // Steps can be seen in the docs link here -> https://github.com/apache/airflow/issues/25322
            "remote_log_conn_id": 'aws_s3_conn',
            "delete_worker_pods": 'False',
            "encrypt_s3_logs": 'True'
        });
    } else {
        assert(!bucket, "S3 bucket is not necessary if Logging is not enabled.");
    }

    // If EFS is enabled for persistent storage
    if (helmOptions.enableEfs){
        const efsAddOnCheck = clusterInfo.getScheduledAddOn(EfsCsiDriverAddOn.name);
        assert(efsAddOnCheck, `Missing a dependency: ${EfsCsiDriverAddOn.name}. Please add it to your list of addons.`); 
        assert(efs, "Please provide the name of EFS File System.");
    } else {
        assert(!efs, "EFS File System is not necessary if EFS is not enabled.");
    }
    

    // Worker

    // Scheduler

    // Webserver

    // 

    return values;
}

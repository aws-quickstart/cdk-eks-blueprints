# Apache Airflow Add-on

Apache Airflow is an open-source platform for developing, scheduling, and monitoring batch-oriented workflows. Airflow contains extensible framework that allows for building workflows connecting with many technologies. For more information on Airflow, please consult the [official documentation](https://airflow.apache.org/docs/).

This add-on is an implementation of Apache Airflow on EKS using the official helm chart.

## Prerequisites

1. If you are using an S3 bucket (for logging storage) or EFS File System (for DAGs persistent storage), you must register the resources using Resource Provider. The framework provides S3 and EFS Resource Provider.
2. If you are using an EFS File System, you must include an EFS CSI Driver in the add-on array, otherwise will run into the following error: `Missing a dependency: EfsCsiDriverAddOn. Please add it to your list of addons.`.
3. If you are using an Ingress with AWS Load Balancer, you must include an AWS Load Balacner Controller in the add-on array, otherwise you will run into the following error: `Missing a dependency: AwsLoadBalancerControllerAddOn. Please add it to your list of addons`.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const apacheAirflowS3Bucket = new blueprints.CreateS3BucketProvider({
    id: 'apache-airflow-s3-bucket-id',
    s3BucketProps: { removalPolicy: cdk.RemovalPolicy.DESTROY }
});
const apacheAirflowEfs = new blueprints.CreateEfsFileSystemProvider({
    name: 'blueprints-apache-airflow-efs',    
});

const addOn = [new blueprints.EfsCsiDriverAddOn(),
    new blueprints.ApacheAirflowAddOn({
        enableLogging: true,
        s3Bucket: 'airflow-logging-s3-bucket',
        enableEfs: true,
        efsFileSystem: 'apache-airflow-efs-provider',
    })
];

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .resourceProvider('apache-airflow-s3-bucket-provider', apacheAirflowS3Bucket)
  .resourceProvider('apache-airflow-efs-provider', apacheAirflowEfs)
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that the Airflow add-on is installed properly, ensure that the required kubernetes resources are running in the cluster:

```bash
kubectl get all -n airflow
```

```bash
NAME                                                             READY   STATUS    RESTARTS     AGE
pod/blueprints-addon-apache-airflow-postgresql-0                 1/1     Running   0            1m4s
pod/blueprints-addon-apache-airflow-scheduler-697958497d-tbblk   2/2     Running   0            1m4s
pod/blueprints-addon-apache-airflow-statsd-5b97b9fcb4-9r8qc      1/1     Running   0            1m4s
pod/blueprints-addon-apache-airflow-triggerer-86b94646c6-xrjnn   2/2     Running   0            1m4s
pod/blueprints-addon-apache-airflow-webserver-6b8db695fc-9d87q   1/1     Running   0            1m4s

NAME                                                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)             AGE
service/blueprints-addon-apache-airflow-postgresql      ClusterIP   172.20.155.11    <none>        5432/TCP            1m4s
service/blueprints-addon-apache-airflow-postgresql-hl   ClusterIP   None             <none>        5432/TCP            1m4s
service/blueprints-addon-apache-airflow-statsd          ClusterIP   172.20.247.149   <none>        9125/UDP,9102/TCP   1m4s
service/blueprints-addon-apache-airflow-webserver       ClusterIP   172.20.211.66    <none>        8080/TCP            1m4s

NAME                                                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/blueprints-addon-apache-airflow-scheduler   1/1     1            1           1m4s
deployment.apps/blueprints-addon-apache-airflow-statsd      1/1     1            1           1m4s
deployment.apps/blueprints-addon-apache-airflow-triggerer   1/1     1            1           1m4s
deployment.apps/blueprints-addon-apache-airflow-webserver   1/1     1            1           1m4s

NAME                                                                   DESIRED   CURRENT   READY   AGE
replicaset.apps/blueprints-addon-apache-airflow-scheduler-669dff9c6d   0         0         0       1m4s
replicaset.apps/blueprints-addon-apache-airflow-scheduler-697958497d   1         1         1       1m4s
replicaset.apps/blueprints-addon-apache-airflow-statsd-5b97b9fcb4      1         1         1       1m4s
replicaset.apps/blueprints-addon-apache-airflow-triggerer-7b7c69486d   0         0         0       1m4s
replicaset.apps/blueprints-addon-apache-airflow-triggerer-86b94646c6   1         1         1       1m4s
replicaset.apps/blueprints-addon-apache-airflow-webserver-5db49dcb94   0         0         0       1m4s
replicaset.apps/blueprints-addon-apache-airflow-webserver-6b8db695fc   1         1         1       1m4s

NAME                                                          READY   AGE
statefulset.apps/blueprints-addon-apache-airflow-postgresql   1/1     1m4s
```

## Testing

To test the Airflow functionality, expose the webserver by port forwarding:

```bash
kubectl port-forward service/blueprints-addon-apache-airflow-webserver -n airflow 8080:8080
```

You should be able to access the webserver via your browser: `http://localhost:8080`. Default username and password are both `admin`.

## Functionality

Applies the Apache Airflow add-on to an Amazon EKS cluster. Optionally, you can leverage integrations with the following AWS services out of the box:

1. S3 Bucket for storing server, worker, and scheduler logs remotely.
2. EFS File System for storing DAGs
3. AWS Load Balancer for ingress to the webserver
4. A Certificate for AWS Certificate Manager for SSL

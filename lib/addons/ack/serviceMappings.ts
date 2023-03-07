/**
 * Chart Mapping for fields such as chart, version, managed IAM policy.
 */
export interface AckChartMapping {
    chart: string,
    version: string,
    managedPolicyName: string
}

/**
 * List of all supported supported AWS services by ACK Addon.
 */
export enum AckServiceName {
  APIGATEWAYV2 = "apigatewayv2",
  APPLICATIONAUTOSCALING = "applicationautoscaling",
  CLOUDTRAIL = "cloudtrail",
  DYNAMODB = "dynamodb",
  EC2 = "ec2",
  ECR = "ecr",
  EKS = "eks",
  ELASTICACHE = "elasticache",
  ELASTICSEARCHSERVICE = "elasticsearchservice",
  EMRCONTAINERS = "emrcontainers",
  IAM = "iam",
  KINESIS = "kinesis",
  KMS = "kms",
  LAMBDA = "lambda",
  MEMORYDB = "memorydb",
  MQ = "mq",
  OPENSEARCHSERVICE = "opensearchservice",
  PROMETHEUSSERVICE = "prometheusservice",
  RDS = "rds",  
  S3 = "s3",
  SFN = "sfn",
  SNS = "sns",
  ACM = "acm",
  ROUTE53 = "route53",
  SQS = "sqs",
  SAGEMAKER = "sagemaker",
  EVENTBRIDGE = "eventbridge"
}

/**
 * List of all Service Mappings such as chart, version, managed IAM policy 
 * for all supported AWS services by ACK Addon.
 */
export const serviceMappings : {[key in AckServiceName]?: AckChartMapping } = {
    [AckServiceName.IAM]: {
      chart: "iam-chart",
      version:  "v1.1.0",
      managedPolicyName: "IAMFullAccess"
    },
    [AckServiceName.RDS]: {
      chart: "rds-chart",
      version:  "v1.0.0",
      managedPolicyName: "AmazonRDSFullAccess"
    },
    [AckServiceName.EC2]: {
      chart: "ec2-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonRDSFullAccess"
    },
    [AckServiceName.S3]: {
      chart: "s3-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonS3FullAccess"
    },
    [AckServiceName.DYNAMODB]: {
      chart: "dynamodb-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonDynamoDBFullAccess"
    },
    [AckServiceName.ECR]: {
      chart: "ecr-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonEC2ContainerRegistryFullAccess"
    },
    [AckServiceName.SNS]: {
      chart: "sns-chart",
      version:  "v0.0.7",
      managedPolicyName: "AmazonSNSFullAccess"
    },
    [AckServiceName.APIGATEWAYV2]: {
      chart: "apigatewayv2-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonAPIGatewayAdministrator"
    },
    [AckServiceName.ELASTICACHE]: {
      chart: "elasticache-chart",
      version:  "v0.0.22",
      managedPolicyName: "AmazonElastiCacheFullAccess"
    },
    [AckServiceName.OPENSEARCHSERVICE]: {
      chart: "opensearchservice-chart",
      version:  "v0.0.14",
      managedPolicyName: "AmazonOpenSearchServiceFullAccess"
    },
    [AckServiceName.MQ]: {
      chart: "mq-chart",
      version:  "v0.0.26",
      managedPolicyName: "AmazonMQFullAccess"
    },
    [AckServiceName.LAMBDA]: {
      chart: "lambda-chart",
      version:  "v0.1.6",
      managedPolicyName: "AWSLambda_FullAccess"
    },
    [AckServiceName.KMS]: {
      chart: "kms-chart",
      version:  "v1.0.1",
      managedPolicyName: "AWSKeyManagementServicePowerUser"
    },
    [AckServiceName.MEMORYDB]: {
      chart: "memorydb-chart",
      version:  "v0.0.7",
      managedPolicyName: "AmazonMemoryDBFullAccess"
    },
    [AckServiceName.EKS]: {
      chart: "eks-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonEKSClusterPolicy"
    },
    [AckServiceName.APPLICATIONAUTOSCALING]: {
      chart: "applicationautoscaling-chart",
      version:  "v1.0.1",
      managedPolicyName: "AutoScalingFullAccess"
    },
    [AckServiceName.ELASTICSEARCHSERVICE]: {
      chart: "elasticsearchservice-chart",
      version:  "v0.0.2",
      managedPolicyName: "AmazonElasticsearchServiceRolePolicy"
    },
    [AckServiceName.PROMETHEUSSERVICE]: {
      chart: "prometheusservice-chart",
      version:  "v1.0.1",
      managedPolicyName: "AmazonPrometheusFullAccess"
    },
    [AckServiceName.EMRCONTAINERS]: {
      chart: "emrcontainers-chart",
      version:  "v1.0.0",
      managedPolicyName: "AmazonEMRContainersServiceRolePolicy"
    },
    [AckServiceName.SFN]: {
      chart: "sfn-chart",
      version:  "v1.0.0",
      managedPolicyName: "AWSStepFunctionsFullAccess"
    },
    [AckServiceName.KINESIS]: {
      chart: "kinesis-chart",
      version:  "v0.0.4",
      managedPolicyName: "AmazonKinesisFullAccess"
    },
    [AckServiceName.CLOUDTRAIL]: {
      chart: "cloudtrail-chart",
      version:  "v1.0.0",
      managedPolicyName: "AWSCloudTrail_FullAccess"
    },
    [AckServiceName.ACM]: {
      chart: "acm-chart",
      version:  "v0.0.4",
      managedPolicyName: "AWSCertificateManagerFullAccess"
    },
    [AckServiceName.ROUTE53]: {
      chart: "route53-chart",
      version:  "v0.0.2",
      managedPolicyName: "AmazonRoute53FullAccess"
    },
    [AckServiceName.SQS]: {
      chart: "sqs-chart",
      version:  "v0.0.3",
      managedPolicyName: "AmazonSQSFullAccess"
    },
    [AckServiceName.SAGEMAKER]: {
      chart: "sagemaker-chart",
      version:  "v1.1.0",
      managedPolicyName: "AmazonSageMakerFullAccess"
    },
    [AckServiceName.EVENTBRIDGE]: {
      chart: "eventbridge-chart",
      version:  "v0.0.5",
      managedPolicyName: "AmazonEventBridgeFullAccess"
    }
};

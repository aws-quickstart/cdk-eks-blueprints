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
  EVENTBRIDGE = "eventbridge",
  PIPES = "pipes",
  SECRETSMANAGER = "secretsmanager",
  ROUTE53RESOLVER = "route53resolver",
  CLOUDWATCH = "cloudwatch",
  ACMPCA = "acmpca",
  CLOUDWATCHLOGS = "cloudwatchlogs"
}

/**
 * List of all Service Mappings such as chart, version, managed IAM policy 
 * for all supported AWS services by ACK Addon.
 */
export const serviceMappings : {[key in AckServiceName]?: AckChartMapping } = {
    [AckServiceName.IAM]: {
      chart: "iam-chart",
      version:  "1.3.1",
      managedPolicyName: "IAMFullAccess"
    },
    [AckServiceName.RDS]: {
      chart: "rds-chart",
      version:  "1.1.8",
      managedPolicyName: "AmazonRDSFullAccess"
    },
    [AckServiceName.EC2]: {
      chart: "ec2-chart",
      version:  "1.1.0",
      managedPolicyName: "AmazonRDSFullAccess"
    },
    [AckServiceName.S3]: {
      chart: "s3-chart",
      version:  "1.0.6",
      managedPolicyName: "AmazonS3FullAccess"
    },
    [AckServiceName.DYNAMODB]: {
      chart: "dynamodb-chart",
      version:  "1.2.5",
      managedPolicyName: "AmazonDynamoDBFullAccess"
    },
    [AckServiceName.ECR]: {
      chart: "ecr-chart",
      version:  "1.0.9",
      managedPolicyName: "AmazonEC2ContainerRegistryFullAccess"
    },
    [AckServiceName.SNS]: {
      chart: "sns-chart",
      version:  "1.0.5",
      managedPolicyName: "AmazonSNSFullAccess"
    },
    [AckServiceName.APIGATEWAYV2]: {
      chart: "apigatewayv2-chart",
      version:  "1.0.6",
      managedPolicyName: "AmazonAPIGatewayAdministrator"
    },
    [AckServiceName.ELASTICACHE]: {
      chart: "elasticache-chart",
      version:  "0.0.28",
      managedPolicyName: "AmazonElastiCacheFullAccess"
    },
    [AckServiceName.OPENSEARCHSERVICE]: {
      chart: "opensearchservice-chart",
      version:  "0.0.18",
      managedPolicyName: "AmazonOpenSearchServiceFullAccess"
    },
    [AckServiceName.MQ]: {
      chart: "mq-chart",
      version:  "0.0.28",
      managedPolicyName: "AmazonMQFullAccess"
    },
    [AckServiceName.LAMBDA]: {
      chart: "lambda-chart",
      version:  "1.3.4",
      managedPolicyName: "AWSLambda_FullAccess"
    },
    [AckServiceName.KMS]: {
      chart: "kms-chart",
      version:  "1.0.7",
      managedPolicyName: "AWSKeyManagementServicePowerUser"
    },
    [AckServiceName.MEMORYDB]: {
      chart: "memorydb-chart",
      version:  "1.0.2",
      managedPolicyName: "AmazonMemoryDBFullAccess"
    },
    [AckServiceName.EKS]: {
      chart: "eks-chart",
      version:  "1.0.5",
      managedPolicyName: "AmazonEKSClusterPolicy"
    },
    [AckServiceName.APPLICATIONAUTOSCALING]: {
      chart: "applicationautoscaling-chart",
      version:  "1.0.8",
      managedPolicyName: "AutoScalingFullAccess"
    },
    [AckServiceName.ELASTICSEARCHSERVICE]: {
      chart: "elasticsearchservice-chart",
      version:  "0.0.2",
      managedPolicyName: "AmazonElasticsearchServiceRolePolicy"
    },
    [AckServiceName.PROMETHEUSSERVICE]: {
      chart: "prometheusservice-chart",
      version:  "1.2.5",
      managedPolicyName: "AmazonPrometheusFullAccess"
    },
    [AckServiceName.EMRCONTAINERS]: {
      chart: "emrcontainers-chart",
      version:  "1.0.4",
      managedPolicyName: "AmazonEMRContainersServiceRolePolicy"
    },
    [AckServiceName.SFN]: {
      chart: "sfn-chart",
      version:  "1.0.5",
      managedPolicyName: "AWSStepFunctionsFullAccess"
    },
    [AckServiceName.KINESIS]: {
      chart: "kinesis-chart",
      version:  "0.0.9",
      managedPolicyName: "AmazonKinesisFullAccess"
    },
    [AckServiceName.CLOUDTRAIL]: {
      chart: "cloudtrail-chart",
      version:  "1.0.5",
      managedPolicyName: "AWSCloudTrail_FullAccess"
    },
    [AckServiceName.ACM]: {
      chart: "acm-chart",
      version:  "0.0.9",
      managedPolicyName: "AWSCertificateManagerFullAccess"
    },
    [AckServiceName.ROUTE53]: {
      chart: "route53-chart",
      version:  "0.0.8",
      managedPolicyName: "AmazonRoute53FullAccess"
    },
    [AckServiceName.SQS]: {
      chart: "sqs-chart",
      version:  "1.0.6",
      managedPolicyName: "AmazonSQSFullAccess"
    },
    [AckServiceName.SAGEMAKER]: {
      chart: "sagemaker-chart",
      version:  "1.2.4",
      managedPolicyName: "AmazonSageMakerFullAccess"
    },
    [AckServiceName.EVENTBRIDGE]: {
      chart: "eventbridge-chart",
      version:  "1.0.4",
      managedPolicyName: "AmazonEventBridgeFullAccess"
    },
    [AckServiceName.PIPES]: {
      chart: "pipes-chart",
      version:  "1.0.2",
      managedPolicyName: "AmazonEventBridgePipesFullAccess"
    },
    [AckServiceName.SECRETSMANAGER]: {
      chart: "secretsmanager-chart",
      version:  "0.0.1",
      managedPolicyName: "SecretsManagerReadWrite"
    },
    [AckServiceName.CLOUDWATCH]: {
      chart: "cloudwatch-chart",
      version:  "0.0.2",
      managedPolicyName: "CloudWatchFullAccess"
    },
    [AckServiceName.ROUTE53RESOLVER]: {
      chart: "route53resolver-chart",
      version:  "0.0.2",
      managedPolicyName: "AmazonRoute53ResolverFullAccess"
    },
    [AckServiceName.ACMPCA]: {
      chart: "acmpca-chart",
      version:  "0.0.2",
      managedPolicyName: "AWSCertificateManagerPrivateCAFullAccess"
    },
    [AckServiceName.CLOUDWATCHLOGS]: {
      chart: "cloudwatchlogs-chart",
      version:  "0.0.1",
      managedPolicyName: "CloudWatchLogsFullAccess"
    }
};

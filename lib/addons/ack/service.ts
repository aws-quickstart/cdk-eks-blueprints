import { AckAddOnProps, AckAddOn } from ".";
import { supportsALL, supportsX86 } from "../../utils";
import { AckServiceName } from "./serviceMappings";

export interface ServiceAckAddOnProps
    extends Omit<AckAddOnProps, "serviceName"> { }

@supportsALL
export class ACMAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ACM,
        };
        super(ackProps);
    }
}
@supportsALL
export class ACMPCAAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ACMPCA,
        };
        super(ackProps);
    }
}
@supportsALL
export class APIGatewayV2AckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.APIGATEWAYV2,
        };
        super(ackProps);
    }
}
@supportsALL
export class ApplicationAutoScalingAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.APPLICATIONAUTOSCALING,
        };
        super(ackProps);
    }
}
@supportsALL
export class CloudtrailAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.CLOUDTRAIL,
        };
        super(ackProps);
    }
}
@supportsALL
export class CloudwatchAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.CLOUDWATCH,
        };
        super(ackProps);
    }
}
@supportsALL
export class CloudwatchLogsAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.CLOUDWATCHLOGS,
        };
        super(ackProps);
    }
}
@supportsALL
export class DynamoDBAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.DYNAMODB,
        };
        super(ackProps);
    }
}
@supportsALL
export class EC2AckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.EC2,
        };
        super(ackProps);
    }
}
@supportsALL
export class ECRAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ECR,
        };
        super(ackProps);
    }
}
@supportsALL
export class EKSAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.EKS,
        };
        super(ackProps);
    }
}
@supportsALL
export class ElasticacheAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ELASTICACHE,
        };
        super(ackProps);
    }
}
@supportsALL
export class ElasticSearchAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ELASTICSEARCHSERVICE,
        };
        super(ackProps);
    }
}
@supportsALL
export class EMRContainersAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.EMRCONTAINERS,
        };
        super(ackProps);
    }
}
@supportsALL
export class EventBridgeAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.EVENTBRIDGE,
        };
        super(ackProps);
    }
}
@supportsALL
export class IAMAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.IAM,
        };
        super(ackProps);
    }
}
@supportsALL
export class KafkaAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.KAFKA,
        };
        super(ackProps);
    }
}
export class KinesisAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.KINESIS,
        };
        super(ackProps);
    }
}
export class KMSAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.KMS,
        };
        super(ackProps);
    }
}
@supportsALL
export class LambdaAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.LAMBDA,
        };
        super(ackProps);
    }
}
// per https://gallery.ecr.aws/aws-controllers-k8s/memorydb-chart on 04/05/2024
@supportsX86
export class MemoryDBAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.MEMORYDB,
        };
        super(ackProps);
    }
}
@supportsALL
export class MQAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.MQ,
        };
        super(ackProps);
    }
}
@supportsALL
export class OpensearchServiceAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.OPENSEARCHSERVICE,
        };
        super(ackProps);
    }
}
@supportsALL
export class PipesAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.PIPES,
        };
        super(ackProps);
    }
}
@supportsALL
export class PrometheusServiceAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.PROMETHEUSSERVICE,
        };
        super(ackProps);
    }
}
@supportsALL
export class RDSAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.RDS,
        };
        super(ackProps);
    }
}
@supportsALL
export class Route53AckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ROUTE53,
        };
        super(ackProps);
    }
}
@supportsALL
export class Route53ResolverAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.ROUTE53RESOLVER,
        };
        super(ackProps);
    }
}
@supportsALL
export class S3AckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.S3,
        };
        super(ackProps);
    }
}
@supportsALL
export class SagemakerAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.SAGEMAKER,
        };
        super(ackProps);
    }
}
@supportsALL
export class SecretsManagerAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.SECRETSMANAGER,
        };
        super(ackProps);
    }
}
@supportsALL
export class SFNAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.SFN,
        };
        super(ackProps);
    }
}
@supportsALL
export class SNSAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.SNS,
        };
        super(ackProps);
    }
}
@supportsALL
export class SQSAckAddOn extends AckAddOn {
    constructor(props?: ServiceAckAddOnProps) {
        const ackProps: AckAddOnProps = {
            ...props,
            serviceName: AckServiceName.SQS,
        };
        super(ackProps);
    }
}

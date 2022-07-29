import { PolicyDocument } from "aws-cdk-lib/aws-iam";

export function getAdotCollectorPolicyDocument() : PolicyDocument {
    return PolicyDocument.fromJson({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "aps:RemoteWrite"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "cloudwatch:PutMetricData",
                        "ec2:DescribeVolumes",
                        "ec2:DescribeTags",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams",
                        "logs:DescribeLogGroups",
                        "logs:CreateLogStream",
                        "logs:CreateLogGroup"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "ssm:GetParameter"
                    ],
                    "Resource": "arn:aws:ssm:*:*:parameter/AmazonCloudWatch-*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "xray:PutTraceSegments",
                        "xray:PutTelemetryRecords",
                        "xray:GetSamplingRules",
                        "xray:GetSamplingTargets",
                        "xray:GetSamplingStatisticSummaries"
                    ],
                    "Resource": [
                        "*"
                    ]
                }
            ]
    });
}

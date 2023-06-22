interface Statement {
    Effect: string;
    Action: string | string[];
    Resource: string | string[];
}

export function getCloudWatchLogsPolicyDocument() : Statement[] {
    const result: Statement[] = [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeTags",
                "logs:PutLogEvents",
                "logs:DescribeLogStreams",
                "logs:DescribeLogGroups",
                "logs:CreateLogStream",
                "logs:CreateLogGroup"
            ],
            "Resource": "*"
        }
    ];
    return result;
}

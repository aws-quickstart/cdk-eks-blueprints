interface Statement {
    Effect: string;
    Action: string | string[];
    Resource: string | string[];
}

export function getBedrockPolicyDocument() : Statement[] {
    const result: Statement[] = [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:*",
            ],
            "Resource": "*"
        }
    ];
    return result;
}

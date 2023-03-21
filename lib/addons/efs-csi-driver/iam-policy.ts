import * as kms from "aws-cdk-lib/aws-kms";

interface Statement {
  Effect: string;
  Action: string | string[];
  Resource: string | string[];
  Condition?: {
    StringEquals?: { [key: string]: string[] | string };
    StringLike?: { [key: string]: string };
    Bool?: { [key: string]: string };
  };
}

export function getEfsDriverPolicyStatements(
  kmsKeys?: kms.Key[]
): Statement[] {
  const result: Statement[] = [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:DescribeAccessPoints",
        "elasticfilesystem:DescribeFileSystems"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:CreateAccessPoint"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "aws:RequestTag/efs.csi.aws.com/cluster": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "elasticfilesystem:DeleteAccessPoint",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/efs.csi.aws.com/cluster": "true"
        }
      }
    }
  ];
  if (kmsKeys) {
    const kmsKeysArns = kmsKeys.map((k) => k.keyArn);
    const kmsPolicy: Statement[] = [
      {
        Effect: "Allow",
        Action: ["kms:CreateGrant", "kms:ListGrants", "kms:RevokeGrant"],
        Resource: kmsKeysArns,
        Condition: {
          Bool: {
            "kms:GrantIsForAWSResource": "true",
          },
        },
      },
      {
        Effect: "Allow",
        Action: [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ],
        Resource: kmsKeysArns,
      },
    ];
    result.push(...kmsPolicy);
  }
  return result;
}

import { PolicyDocument } from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";

interface Statement {
  Effect: string;
  Action: string[];
  Resource: string | string[];
  Condition?: {
    StringEquals?: { [key: string]: string[] };
    StringLike?: { [key: string]: string };
    Bool?: { [key: string]: string };
  };
}

export function getEbsDriverPolicyDocument(
  partition: string,
  kmsKeys?: kms.Key[]
): PolicyDocument {
  const result: { Version: string; Statement: Statement[] } = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:CreateSnapshot",
          "ec2:AttachVolume",
          "ec2:DetachVolume",
          "ec2:ModifyVolume",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeInstances",
          "ec2:DescribeSnapshots",
          "ec2:DescribeTags",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumesModifications",
        ],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: ["ec2:CreateTags"],
        Resource: [
          `arn:${partition}:ec2:*:*:volume/*`,
          `arn:${partition}:ec2:*:*:snapshot/*`,
        ],
        Condition: {
          StringEquals: {
            "ec2:CreateAction": ["CreateVolume", "CreateSnapshot"],
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteTags"],
        Resource: [
          `arn:${partition}:ec2:*:*:volume/*`,
          `arn:${partition}:ec2:*:*:snapshot/*`,
        ],
      },
      {
        Effect: "Allow",
        Action: ["ec2:CreateVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "aws:RequestTag/ebs.csi.aws.com/cluster": "true",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:CreateVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "aws:RequestTag/CSIVolumeName": "*",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:CreateVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "aws:RequestTag/kubernetes.io/cluster/*": "owned",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "ec2:ResourceTag/ebs.csi.aws.com/cluster": "true",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "ec2:ResourceTag/CSIVolumeName": "*",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteVolume"],
        Resource: "*",
        Condition: {
          StringLike: {
            "ec2:ResourceTag/kubernetes.io/cluster/*": "owned",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteSnapshot"],
        Resource: "*",
        Condition: {
          StringLike: {
            "ec2:ResourceTag/CSIVolumeSnapshotName": "*",
          },
        },
      },
      {
        Effect: "Allow",
        Action: ["ec2:DeleteSnapshot"],
        Resource: "*",
        Condition: {
          StringLike: {
            "ec2:ResourceTag/ebs.csi.aws.com/cluster": "true",
          },
        },
      },
    ],
  };
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
    result.Statement.push(...kmsPolicy);
  }
  return PolicyDocument.fromJson(result);
}

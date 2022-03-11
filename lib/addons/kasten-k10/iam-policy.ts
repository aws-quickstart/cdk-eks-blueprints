// IAM policy for Kasten K10
export const KastenEC2IamPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CopySnapshot",
                "ec2:CreateSnapshot",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:DeleteTags",
                "ec2:DeleteVolume",
                "ec2:DescribeSnapshotAttribute",
                "ec2:ModifySnapshotAttribute",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeSnapshots",
                "ec2:DescribeTags",
                "ec2:DescribeVolumeAttribute",
                "ec2:DescribeVolumesModifications",
                "ec2:DescribeVolumeStatus",
                "ec2:DescribeVolumes"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "ec2:DeleteSnapshot",
            "Resource": "*",
            "Condition": {
                "StringLike": {
                    "ec2:ResourceTag/Name": "Kasten: Snapshot*"
                }
            }
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:PutBucketPolicy",
                "s3:ListBucket",
                "s3:DeleteObject",
                "s3:DeleteBucketPolicy",
                "s3:GetBucketLocation",
                "s3:GetBucketPolicy"
            ],
            "Resource": "*"
        }
    ]
}
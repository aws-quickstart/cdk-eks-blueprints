import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * IAM policy to grant access to S3 buckets and, optionally, KMS keys
 * https://github.com/awslabs/mountpoint-s3/blob/main/doc/CONFIGURATION.md#iam-permissions
 */
export function getS3DriverPolicyStatements(bucketNames: string[], kmsArns: string[]): iam.PolicyStatement[] {
    const arns = bucketNames.map((name) => `arn:aws:s3:::${name}`);
    const bucketPolicy = [
        new iam.PolicyStatement({
            sid: 'S3MountpointFullBucketAccess',
            actions: [
                "s3:ListBucket"
            ],
            resources: arns
        }),
        new iam.PolicyStatement({
            sid: 'S3MountpointFullObjectAccess',
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:DeleteObject"
            ],
            resources: arns.map((arn) => `${arn}/*`)
        }),
    ];
    const kmsPolicy = kmsArns.length > 0 ? [
        new iam.PolicyStatement({
            sid: "S3MountpointKmsAccess",
            actions: [
                "kms:Decrypt",
                "kms:GenerateDataKey"
            ],
            resources: kmsArns
        })] : [];

    return [...bucketPolicy, ...kmsPolicy];
}

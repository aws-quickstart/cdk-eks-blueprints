import * as iam from 'aws-cdk-lib/aws-iam';

export function getS3DriverPolicyStatements(s3BucketName: string): iam.PolicyStatement[] {
    // new IAM policy to grand access to S3 bucket
    // https://github.com/awslabs/mountpoint-s3/blob/main/doc/CONFIGURATION.md#iam-permissions
    const s3BucketArn = `arn:aws:s3:::${s3BucketName}`;
    return [
        new iam.PolicyStatement({
            sid: 'S3MountpointFullBucketAccess',
            actions: [
                "s3:ListBucket"
            ],
            resources: [s3BucketArn]
        }),
        new iam.PolicyStatement({
            sid: 'S3MountpointFullObjectAccess',
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:DeleteObject"
            ],
            resources: [`${s3BucketArn}/*`]
        })];
}
import * as iam from 'aws-cdk-lib/aws-iam';

export function getS3DriverPolicyStatements(s3BucketNames: string[]): iam.PolicyStatement[] {
    // new IAM policy to grand access to S3 bucket
    // https://github.com/awslabs/mountpoint-s3/blob/main/doc/CONFIGURATION.md#iam-permissions
    const s3BucketArns = s3BucketNames.map((name) => `arn:aws:s3:::${name}`);
    return [
        new iam.PolicyStatement({
            sid: 'S3MountpointFullBucketAccess',
            actions: [
                "s3:ListBucket"
            ],
            resources: s3BucketArns
        }),
        new iam.PolicyStatement({
            sid: 'S3MountpointFullObjectAccess',
            actions: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:DeleteObject"
            ],
            resources: s3BucketArns.map((arn) => `${arn}/*`)
        })];
}

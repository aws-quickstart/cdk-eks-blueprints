import * as spi from '../spi';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';

/**
 * S3 provider that imports S3 bucket into the current stack by name. 
 */
export class ImportS3Provider implements spi.ResourceProvider<s3.IBucket> {

    /**
     * @param s3BucketName name of the S3 Bucket to look up
     * @param id  optional id for the structure (for tracking). set to s3bucketname by default
     */
    constructor(private readonly s3BucketName: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : s3.IBucket {
        return s3.Bucket.fromBucketName(context.scope, this.id ?? `${this.s3BucketName}-Lookup`, this.s3BucketName);
    }
}

/**
 * S3 provider that creates a new S3 Bucket. 
 */
export class CreateS3Provider implements spi.ResourceProvider<s3.IBucket> {

    /**
     * Creates the S3 provider.
     * @param name Name of the S3 Bucket. This must be 
     */
    constructor(readonly name : string, readonly id : string) {}

    provide(context: spi.ResourceContext) : s3.IBucket {
        return new s3.Bucket(context.scope, this.id, {
            bucketName: this.name
        });       
    }
}
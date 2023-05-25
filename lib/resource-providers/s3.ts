import * as spi from '../spi';
import * as s3 from 'aws-cdk-lib/aws-s3';

export interface CreateS3BucketProps {
    readonly name?: string,
    readonly id: string,
    readonly s3BucketProps?: Omit<s3.BucketProps, "bucketName">
}

/**
 * S3 Bucket provider that imports an S3 Bucket into the current stack by name. 
 */
export class ImportS3BucketProvider implements spi.ResourceProvider<s3.IBucket> {

    /**
     * @param s3BucketName name of the S3 Bucket to look up
     * @param id optional id for the structure (for tracking). set to s3bucketname by default
     */
    constructor(private readonly s3BucketName: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : s3.IBucket {
        return s3.Bucket.fromBucketName(context.scope, this.id ?? `${this.s3BucketName}-Lookup`, this.s3BucketName);
    }
}

/**
 * S3 Bucket provider that creates a new S3 Bucket. 
 */
export class CreateS3BucketProvider implements spi.ResourceProvider<s3.IBucket> {

    readonly options: CreateS3BucketProps;
    /**
     * Creates the S3 provider.
     * @param name Name of the S3 Bucket. This must be globally unique.
     */
    constructor(options: CreateS3BucketProps) {}

    provide(context: spi.ResourceContext) : s3.IBucket {
        return new s3.Bucket(context.scope, this.options.id, {
            bucketName: this.options.name,
            ...this.options.s3BucketProps,
        });       
    }
}
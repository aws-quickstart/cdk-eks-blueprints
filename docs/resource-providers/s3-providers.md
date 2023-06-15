## S3 Bucket Resource Providers

### CreateS3BucketProvider
Creates a new S3 bucket and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprints.builder()
  .resourceProvider("s3-bucket", new blueprints.CreateS3BucketProvider({
    name: 'unique-bucket-name',
    id: 's3-bucket-id',
    s3BucketProps: {removalPolicy: cdk.RemovalPolicy.DESTROY}
  }))
  ...
  .build()
```

### ImportS3BucketProvider
Looks up a bucket by name and optional id and imports it into the stack.

Example Implementation:
```typescript
blueprints.EksBlueprints.builder()
  .resourceProvider("s3-bucket", new blueprints.ImportS3BucketProvider("bucket-name", 'bucket-id'))
  ...
  .build()
```


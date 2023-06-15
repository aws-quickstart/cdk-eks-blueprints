## S3 Bucket Resource Providers

### CreateS3BucketProvider
Creates a new S3 bucket and makes it available to the blueprint constructs under the provided name.

Example Implementation:
```typescript
blueprints.EksBlueprints.builder()
  .resourceProvider("s3-bucket", new blueprints.CreateS3BucketProvider({
    name: 'unique-bucket-name',
    id: 's3-bucket-id',
    s3BucketProps: {removalPolicy: cdk.RemovalPolicy.DESTROY},
  }))
  ...
  .build();
```

### ImportS3BucketProvider
Looks up a bucket by name and optional id and makes it available to the blueprint constructs under the provided name.

Example Implementation:
```typescript
blueprints.EksBlueprints.builder()
  .resourceProvider("s3-bucket", new blueprints.ImportS3BucketProvider("bucket-name", 'bucket-id'))
  ...
  .build();
```


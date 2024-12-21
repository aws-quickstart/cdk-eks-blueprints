# S3 CSI Driver Addon

The S3 CSI Driver Addon integrates Amazon S3 with your Kubernetes cluster, allowing you to use S3 buckets as persistent storage for your applications.

## Prerequisites

- The S3 bucket must be created in AWS separately as the driver uses the S3 bucket for storage, but it does not create it.
- The S3 bucket must have a bucket policy that allows the EKS cluster to access the bucket.

## Usage

```typescript
import { S3CsiDriverAddon } from '@aws-quickstart/eks-blueprints';

const addOns = [
    new S3CsiDriverAddon({
        s3BucketName: 'my-s3-bucket',
    }),
    // other addons
];

const blueprint = EksBlueprint.builder()
    .addOns(...addOns)
    .build(app, 'my-stack');
```

## Configuration

You can customize the S3 CSI Driver Addon by passing configuration options:

```typescript
new S3CsiDriverAddon({
    s3BucketName: 'my-s3-bucket',
});
```

## Use in EKS Cluster

Once installed, you can create PersistentVolume and PersistentVolumeClaim resources that use the S3 CSI Driver:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
    name: s3-pv
spec:
    capacity:
        storage: 5Gi
    accessModes:
        - ReadWriteOnce
    csi:
        driver: s3.csi.aws.com
        volumeHandle: my-s3-bucket
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
    name: s3-pvc
spec:
    accessModes:
        - ReadWriteOnce
    resources:
        requests:
            storage: 5Gi
    volumeName: s3-pv
```

## References

- [Amazon S3 CSI Driver Source](https://github.com/awslabs/mountpoint-s3-csi-driver)
- [Amazon EKS S3 CSI Driver Documentation](https://docs.aws.amazon.com/eks/latest/userguide/s3-csi.html)

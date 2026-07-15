import { ClusterAddOn, ClusterInfo } from '../../spi';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks-v2';
import { conflictsWith, mustRunOnAutoMode, supportsALL } from '../../utils';


@supportsALL
export class EbsCsiDefaultStorageClassAddOn implements ClusterAddOn {

  @conflictsWith('EbsCsiDriverAddOn')
  @mustRunOnAutoMode()
  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;
    const storageClassManifest = {
      apiVersion: "storage.k8s.io/v1",
      kind: "StorageClass",
      metadata: {
        name: "auto-ebs-sc",
        annotations: {
          "storageclass.kubernetes.io/is-default-class": "true"
        }
      },
      provisioner: "ebs.csi.eks.amazonaws.com",
      volumeBindingMode: "WaitForFirstConsumer",
      parameters: {
        type: "gp3",
        encrypted: "true"
      }
    };
    new KubernetesManifest(cluster.stack, 'ebs-storage-class', {
      cluster,
      manifest: [storageClassManifest],
      overwrite: true
    });
  }
}


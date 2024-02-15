import { PolicyDocument } from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import { ClusterInfo } from "../../spi";
import { CoreAddOn, CoreAddOnProps } from "../core-addon";
import { getEbsDriverPolicyDocument } from "./iam-policy";
import { supportsALL } from "../../utils";
import { Construct } from "constructs";
import { KubernetesManifest, KubernetesPatch } from "aws-cdk-lib/aws-eks";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

const versionMap: Map<KubernetesVersion, string> = new Map([
    [KubernetesVersion.V1_28, "v1.26.1-eksbuild.1"],
    [KubernetesVersion.V1_27, "v1.26.1-eksbuild.1"],
    [KubernetesVersion.V1_26, "v1.26.1-eksbuild.1"]
]);

/**
 * Interface for EBS CSI Driver EKS add-on options
 */
export interface EbsCsiDriverAddOnProps extends CoreAddOnProps {
  /**
   * List of KMS keys to be used for encryption
   */
  kmsKeys?: kms.Key[];
  /**
   * StorageClass to be used for the addon
   */
  storageClass?: string;
}

/**
 * Default values for the add-on
 */
const defaultProps: CoreAddOnProps & EbsCsiDriverAddOnProps = {
  addOnName: "aws-ebs-csi-driver",
  version: "v1.23.0-eksbuild.1",
  saName: "ebs-csi-controller-sa",
  storageClass: "gp3", // Set the default StorageClass to gp3
};

/**
 * Implementation of EBS CSI Driver EKS add-on
 */
@supportsALL
export class EbsCsiDriverAddOn extends CoreAddOn {
  readonly ebsProps: EbsCsiDriverAddOnProps;

  constructor(readonly options?: EbsCsiDriverAddOnProps) {
    super({
      addOnName: defaultProps.addOnName,
      version: options?.version ?? defaultProps.version,
      saName: defaultProps.saName,
    });

    this.ebsProps = {
      ...defaultProps,
      ...options,
    };
  }

  providePolicyDocument(clusterInfo: ClusterInfo): PolicyDocument {
    return getEbsDriverPolicyDocument(
      clusterInfo.cluster.stack.partition,
      this.options?.kmsKeys
    );
  }

  async deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const baseDeployment = await super.deploy(clusterInfo);

    const cluster = clusterInfo.cluster;
    let updateSc: KubernetesManifest;

    if (this.ebsProps.storageClass) {
      // patch resource on cluster
      const patchSc = new KubernetesPatch(
        cluster.stack,
        `${cluster}-RemoveGP2SC`,
        {
          cluster: cluster,
          resourceName: "storageclass/gp2",
          applyPatch: {
            metadata: {
              annotations: {
                "storageclass.kubernetes.io/is-default-class": "false",
              },
            },
          },
          restorePatch: {
            metadata: {
              annotations: {
                "storageclass.kubernetes.io/is-default-class": "true",
              },
            },
          },
        }
      );

      // Create and set gp3 StorageClass as cluster-wide default
      updateSc = new KubernetesManifest(
        cluster.stack,
        `${cluster}-SetDefaultSC`,
        {
          cluster: cluster,
          manifest: [
            {
              apiVersion: "storage.k8s.io/v1",
              kind: "StorageClass",
              metadata: {
                name: "gp3",
                annotations: {
                  "storageclass.kubernetes.io/is-default-class": "true",
                },
              },
              provisioner: "ebs.csi.aws.com",
              reclaimPolicy: "Delete",
              volumeBindingMode: "WaitForFirstConsumer",
              parameters: {
                type: "gp3",
                fsType: "ext4",
                encrypted: "true",
              },
            },
          ],
        }
      );

      patchSc.node.addDependency(baseDeployment);
      updateSc.node.addDependency(patchSc);

      return updateSc;
    } else 
    {
      return baseDeployment;
    }
  }
}

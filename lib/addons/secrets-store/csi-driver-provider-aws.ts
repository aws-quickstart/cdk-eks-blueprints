import * as cdk from "@aws-cdk/core";
import { ClusterInfo } from "../../spi";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { KubernetesManifest } from "@aws-cdk/aws-eks";

export class CsiDriverProviderAws {

  constructor(
    private namespace: string,
    private version: string,
    private rotationPollInterval?: string,
    private syncSecrets?: boolean) {}

  deploy(clusterInfo: ClusterInfo): KubernetesManifest {
    const cluster = clusterInfo.cluster;

    type chartValues = {
      linux: {
        image: {
          tag: string
        }
      },
      enableSecretRotation?: string,
      rotationPollInterval?: string,
      syncSecret?: {
        enabled: string
      },
      grpcSupportedProviders: string
    }

    let values: chartValues = {
      linux: {
        image: {
          tag: this.version
        }
      },
      grpcSupportedProviders: 'aws'
    };

    if (typeof(this.rotationPollInterval) === 'string') {
      values.enableSecretRotation = 'true';
      values.rotationPollInterval = this.rotationPollInterval;
    }

    if (this.syncSecrets === true) {
      values.syncSecret = {
        enabled: 'true'
      }
    }

    const chart = 'secrets-store-csi-driver';
    const secretStoreCSIDriverHelmChart = cluster.addHelmChart('SecretsStoreCSIDriver', {
      chart,
      repository: 'https://raw.githubusercontent.com/kubernetes-sigs/secrets-store-csi-driver/master/charts',
      namespace: this.namespace,
      release: chart,
      version: this.version,
      wait: true,
      timeout: cdk.Duration.minutes(15),
      values,
    });

    const manifestUrl = `https://raw.githubusercontent.com/aws/secrets-store-csi-driver-provider-aws/main/deployment/aws-provider-installer.yaml`;
    const manifest: Record<string, any>[] = loadExternalYaml(manifestUrl);
    const secretProviderManifest = clusterInfo.cluster.addManifest('SecretsStoreCsiDriverProviderAws', ...manifest);
    secretProviderManifest.node.addDependency(secretStoreCSIDriverHelmChart);
    return secretProviderManifest;
  }
}
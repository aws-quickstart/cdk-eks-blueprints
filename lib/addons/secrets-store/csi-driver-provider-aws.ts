import * as cdk from "@aws-cdk/core";
import { ClusterInfo } from "../../spi";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { SecretsStoreAddOnProps } from ".";
import merge from "ts-deepmerge";


export class CsiDriverProviderAws {

  constructor(private props: SecretsStoreAddOnProps) {}

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
          tag: this.props.version!
        }
      },
      grpcSupportedProviders: 'aws'
    };

    if (typeof(this.props.rotationPollInterval) === 'string') {
      values.enableSecretRotation = 'true';
      values.rotationPollInterval = this.props.rotationPollInterval;
    }

    if (this.props.syncSecrets === true) {
      values.syncSecret = {
        enabled: 'true'
      }
    }

    values = merge(values, this.props.values ?? {});

    const secretStoreCSIDriverHelmChart = cluster.addHelmChart('SecretsStoreCSIDriver', {
      chart: this.props.chart!,
      repository: this.props.repository!,
      namespace: this.props.namespace!,
      release: this.props.release,
      version: this.props.version,
      wait: true,
      timeout: cdk.Duration.minutes(15),
      values,
    });

    const manifestUrl = this.props.ascpUrl!;
    const manifest: Record<string, any>[] = loadExternalYaml(manifestUrl);
    const secretProviderManifest = clusterInfo.cluster.addManifest('SecretsStoreCsiDriverProviderAws', ...manifest);
    secretProviderManifest.node.addDependency(secretStoreCSIDriverHelmChart);
    return secretProviderManifest;
  }
}
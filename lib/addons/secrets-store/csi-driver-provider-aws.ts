import * as cdk from "aws-cdk-lib";
import { ClusterInfo, Values } from "../../spi";
import { loadExternalYaml } from "../../utils/yaml-utils";
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { SecretsStoreAddOnProps } from ".";
import merge from "ts-deepmerge";
import { HelmAddOn } from "../helm-addon";


export class CsiDriverProviderAws {

  constructor(private props: SecretsStoreAddOnProps) {}

  deploy(clusterInfo: ClusterInfo): KubernetesManifest {
    const cluster = clusterInfo.cluster;

    let values: Values = {
      grpcSupportedProviders: 'aws'
    };

    if (typeof(this.props.rotationPollInterval) === 'string') {
      values.enableSecretRotation = 'true';
      values.rotationPollInterval = this.props.rotationPollInterval;
    }

    if (this.props.syncSecrets === true) {
      values.syncSecret = {
        enabled: 'true'
      };
    }

    values = merge(values, this.props.values ?? {});
    
    const helmChartOptions = {
        chart: this.props.chart!,
        repository: this.props.repository!,
        namespace: this.props.namespace!,
        release: this.props.release,
        version: this.props.version,
        wait: true,
        timeout: cdk.Duration.minutes(15),
        values,
      };

    HelmAddOn.validateVersion({
        chart: helmChartOptions.chart,
        repository: helmChartOptions.repository,
        version: helmChartOptions.version!
    });

    const secretStoreCSIDriverHelmChart = cluster.addHelmChart('SecretsStoreCSIDriver', helmChartOptions);

    const manifestUrl = this.props.ascpUrl!;
    const manifest: Record<string, any>[] = loadExternalYaml(manifestUrl);
    const secretProviderManifest = clusterInfo.cluster.addManifest('SecretsStoreCsiDriverProviderAws', ...manifest);
    secretProviderManifest.node.addDependency(secretStoreCSIDriverHelmChart);
    return secretProviderManifest;
  }
}
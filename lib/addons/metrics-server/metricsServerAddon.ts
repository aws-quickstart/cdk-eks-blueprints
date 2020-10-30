import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";

export class MetricsServerAddon implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
    const stable = 'https://kubernetes-charts.storage.googleapis.com/';
    stack.cluster.addHelmChart("metrics-server", {
        repository: stable,
        chart: 'metrics-server',
        release: 'metrics-server'
    });
  }
}
import { ClusterAddOn, ClusterInfo } from "../../eksBlueprintStack";

export class NginxAddon implements ClusterAddOn {

  deploy(clusterInfo: ClusterInfo): void {
       clusterInfo.cluster.addHelmChart("ngninx-ingress", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system"
        });
  }
}
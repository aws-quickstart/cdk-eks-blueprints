import { CdkEksBlueprintStack, ClusterAddOn } from "../../eksBlueprintStack";

export class NginxAddon implements ClusterAddOn {

  deploy(stack: CdkEksBlueprintStack): void {
       stack.cluster.addHelmChart("ngninx-ingress", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system"
        });
  }
}
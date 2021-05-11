"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NginxAddon = void 0;
class NginxAddon {
    deploy(clusterInfo) {
        clusterInfo.cluster.addHelmChart("ngninx-addon", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system"
        });
    }
}
exports.NginxAddon = NginxAddon;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvYWRkb25zL25naW54L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsVUFBVTtJQUVuQixNQUFNLENBQUMsV0FBd0I7UUFDM0IsV0FBVyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFO1lBQzdDLEtBQUssRUFBRSxlQUFlO1lBQ3RCLFVBQVUsRUFBRSwrQkFBK0I7WUFDM0MsU0FBUyxFQUFFLGFBQWE7U0FDM0IsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBVEQsZ0NBU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbHVzdGVyQWRkT24sIENsdXN0ZXJJbmZvIH0gZnJvbSBcIi4uLy4uL3N0YWNrcy9la3MtYmx1ZXByaW50LXN0YWNrXCI7XG5cbmV4cG9ydCBjbGFzcyBOZ2lueEFkZG9uIGltcGxlbWVudHMgQ2x1c3RlckFkZE9uIHtcblxuICAgIGRlcGxveShjbHVzdGVySW5mbzogQ2x1c3RlckluZm8pOiB2b2lkIHtcbiAgICAgICAgY2x1c3RlckluZm8uY2x1c3Rlci5hZGRIZWxtQ2hhcnQoXCJuZ25pbngtYWRkb25cIiwge1xuICAgICAgICAgICAgY2hhcnQ6IFwibmdpbngtaW5ncmVzc1wiLFxuICAgICAgICAgICAgcmVwb3NpdG9yeTogXCJodHRwczovL2hlbG0ubmdpbnguY29tL3N0YWJsZVwiLFxuICAgICAgICAgICAgbmFtZXNwYWNlOiBcImt1YmUtc3lzdGVtXCJcbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
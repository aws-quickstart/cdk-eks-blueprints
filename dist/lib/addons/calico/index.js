"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalicoAddon = void 0;
class CalicoAddon {
    deploy(clusterInfo) {
        clusterInfo.cluster.addHelmChart("calico-addon", {
            chart: "aws-calico",
            release: "aws-calico",
            repository: "https://aws.github.io/eks-charts",
            namespace: "kube-system"
        });
    }
}
exports.CalicoAddon = CalicoAddon;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvYWRkb25zL2NhbGljby9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFFcEIsTUFBTSxDQUFDLFdBQXdCO1FBQzNCLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRTtZQUM3QyxLQUFLLEVBQUUsWUFBWTtZQUNuQixPQUFPLEVBQUUsWUFBWTtZQUNyQixVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLFNBQVMsRUFBRSxhQUFhO1NBQzNCLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQVZELGtDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlckFkZE9uLCBDbHVzdGVySW5mbyB9IGZyb20gXCIuLi8uLi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFja1wiO1xuXG5leHBvcnQgY2xhc3MgQ2FsaWNvQWRkb24gaW1wbGVtZW50cyBDbHVzdGVyQWRkT24ge1xuXG4gICAgZGVwbG95KGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbyk6IHZvaWQge1xuICAgICAgICBjbHVzdGVySW5mby5jbHVzdGVyLmFkZEhlbG1DaGFydChcImNhbGljby1hZGRvblwiLCB7XG4gICAgICAgICAgICBjaGFydDogXCJhd3MtY2FsaWNvXCIsXG4gICAgICAgICAgICByZWxlYXNlOiBcImF3cy1jYWxpY29cIixcbiAgICAgICAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9hd3MuZ2l0aHViLmlvL2Vrcy1jaGFydHNcIixcbiAgICAgICAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiXG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=
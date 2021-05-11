"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgoCDAddon = void 0;
class ArgoCDAddon {
    deploy(clusterInfo) {
        clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            repository: "https://argoproj.github.io/argo-helm",
            version: '3.2.3',
            namespace: "argocd",
        });
    }
}
exports.ArgoCDAddon = ArgoCDAddon;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvYWRkb25zL2FyZ29jZC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFFcEIsTUFBTSxDQUFDLFdBQXdCO1FBQzNCLFdBQVcsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRTtZQUM3QyxLQUFLLEVBQUUsU0FBUztZQUNoQixVQUFVLEVBQUUsc0NBQXNDO1lBQ2xELE9BQU8sRUFBRSxPQUFPO1lBQ2hCLFNBQVMsRUFBRSxRQUFRO1NBQ3RCLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQVZELGtDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlckFkZE9uLCBDbHVzdGVySW5mbyB9IGZyb20gXCIuLi8uLi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFja1wiO1xuXG5leHBvcnQgY2xhc3MgQXJnb0NEQWRkb24gaW1wbGVtZW50cyBDbHVzdGVyQWRkT24ge1xuXG4gICAgZGVwbG95KGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbyk6IHZvaWQge1xuICAgICAgICBjbHVzdGVySW5mby5jbHVzdGVyLmFkZEhlbG1DaGFydChcImFyZ29jZC1hZGRvblwiLCB7XG4gICAgICAgICAgICBjaGFydDogXCJhcmdvLWNkXCIsXG4gICAgICAgICAgICByZXBvc2l0b3J5OiBcImh0dHBzOi8vYXJnb3Byb2ouZ2l0aHViLmlvL2FyZ28taGVsbVwiLFxuICAgICAgICAgICAgdmVyc2lvbjogJzMuMi4zJyxcbiAgICAgICAgICAgIG5hbWVzcGFjZTogXCJhcmdvY2RcIixcbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
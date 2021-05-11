"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppMeshAddon = void 0;
const aws_iam_1 = require("@aws-cdk/aws-iam");
class AppMeshAddon {
    deploy(clusterInfo) {
        const cluster = clusterInfo.cluster;
        // App Mesh service account.
        const opts = { name: 'appmesh-controller', namespace: "appmesh-system" };
        const sa = cluster.addServiceAccount('appmesh-controller', opts);
        // Cloud Map Full Access policy.
        const cloudMapPolicy = aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AWSCloudMapFullAccess");
        sa.role.addManagedPolicy(cloudMapPolicy);
        // App Mesh Full Access policy.
        const appMeshPolicy = aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshFullAccess");
        sa.role.addManagedPolicy(appMeshPolicy);
        // App Mesh Namespace
        const appMeshNS = cluster.addManifest('appmesh-ns', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'appmesh-system' }
        });
        sa.node.addDependency(appMeshNS);
        // App Mesh Controller        
        const chart = cluster.addHelmChart("appmesh-addon", {
            chart: "appmesh-controller",
            repository: "https://aws.github.io/eks-charts",
            release: "appm-release",
            namespace: "appmesh-system",
            values: {
                "region": cluster.stack.region,
                "serviceAccount.create": false,
                "serviceAccount.name": "appmesh-controller"
            }
        });
        chart.node.addDependency(sa);
    }
}
exports.AppMeshAddon = AppMeshAddon;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvYWRkb25zL2FwcG1lc2gvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOENBQWlEO0FBSWpELE1BQWEsWUFBWTtJQUVyQixNQUFNLENBQUMsV0FBd0I7UUFFM0IsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUVwQyw0QkFBNEI7UUFDNUIsTUFBTSxJQUFJLEdBQUcsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLENBQUE7UUFDeEUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWpFLGdDQUFnQztRQUNoQyxNQUFNLGNBQWMsR0FBRyx1QkFBYSxDQUFDLHdCQUF3QixDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDdEYsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUV6QywrQkFBK0I7UUFDL0IsTUFBTSxhQUFhLEdBQUcsdUJBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3BGLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEMscUJBQXFCO1FBQ3JCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFO1lBQ2hELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtTQUN2QyxDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVqQyw4QkFBOEI7UUFDOUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUU7WUFDaEQsS0FBSyxFQUFFLG9CQUFvQjtZQUMzQixVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLE9BQU8sRUFBRSxjQUFjO1lBQ3ZCLFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsTUFBTSxFQUFFO2dCQUNKLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU07Z0JBQzlCLHVCQUF1QixFQUFFLEtBQUs7Z0JBQzlCLHFCQUFxQixFQUFFLG9CQUFvQjthQUM5QztTQUNKLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDSjtBQXhDRCxvQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNYW5hZ2VkUG9saWN5IH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1pYW1cIjtcblxuaW1wb3J0IHsgQ2x1c3RlckFkZE9uLCBDbHVzdGVySW5mbyB9IGZyb20gXCIuLi8uLi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFja1wiXG5cbmV4cG9ydCBjbGFzcyBBcHBNZXNoQWRkb24gaW1wbGVtZW50cyBDbHVzdGVyQWRkT24ge1xuXG4gICAgZGVwbG95KGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbyk6IHZvaWQge1xuXG4gICAgICAgIGNvbnN0IGNsdXN0ZXIgPSBjbHVzdGVySW5mby5jbHVzdGVyO1xuXG4gICAgICAgIC8vIEFwcCBNZXNoIHNlcnZpY2UgYWNjb3VudC5cbiAgICAgICAgY29uc3Qgb3B0cyA9IHsgbmFtZTogJ2FwcG1lc2gtY29udHJvbGxlcicsIG5hbWVzcGFjZTogXCJhcHBtZXNoLXN5c3RlbVwiIH1cbiAgICAgICAgY29uc3Qgc2EgPSBjbHVzdGVyLmFkZFNlcnZpY2VBY2NvdW50KCdhcHBtZXNoLWNvbnRyb2xsZXInLCBvcHRzKTtcblxuICAgICAgICAvLyBDbG91ZCBNYXAgRnVsbCBBY2Nlc3MgcG9saWN5LlxuICAgICAgICBjb25zdCBjbG91ZE1hcFBvbGljeSA9IE1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQVdTQ2xvdWRNYXBGdWxsQWNjZXNzXCIpXG4gICAgICAgIHNhLnJvbGUuYWRkTWFuYWdlZFBvbGljeShjbG91ZE1hcFBvbGljeSk7XG5cbiAgICAgICAgLy8gQXBwIE1lc2ggRnVsbCBBY2Nlc3MgcG9saWN5LlxuICAgICAgICBjb25zdCBhcHBNZXNoUG9saWN5ID0gTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBV1NBcHBNZXNoRnVsbEFjY2Vzc1wiKVxuICAgICAgICBzYS5yb2xlLmFkZE1hbmFnZWRQb2xpY3koYXBwTWVzaFBvbGljeSk7XG5cbiAgICAgICAgLy8gQXBwIE1lc2ggTmFtZXNwYWNlXG4gICAgICAgIGNvbnN0IGFwcE1lc2hOUyA9IGNsdXN0ZXIuYWRkTWFuaWZlc3QoJ2FwcG1lc2gtbnMnLCB7XG4gICAgICAgICAgICBhcGlWZXJzaW9uOiAndjEnLFxuICAgICAgICAgICAga2luZDogJ05hbWVzcGFjZScsXG4gICAgICAgICAgICBtZXRhZGF0YTogeyBuYW1lOiAnYXBwbWVzaC1zeXN0ZW0nIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHNhLm5vZGUuYWRkRGVwZW5kZW5jeShhcHBNZXNoTlMpO1xuXG4gICAgICAgIC8vIEFwcCBNZXNoIENvbnRyb2xsZXIgICAgICAgIFxuICAgICAgICBjb25zdCBjaGFydCA9IGNsdXN0ZXIuYWRkSGVsbUNoYXJ0KFwiYXBwbWVzaC1hZGRvblwiLCB7XG4gICAgICAgICAgICBjaGFydDogXCJhcHBtZXNoLWNvbnRyb2xsZXJcIixcbiAgICAgICAgICAgIHJlcG9zaXRvcnk6IFwiaHR0cHM6Ly9hd3MuZ2l0aHViLmlvL2Vrcy1jaGFydHNcIixcbiAgICAgICAgICAgIHJlbGVhc2U6IFwiYXBwbS1yZWxlYXNlXCIsXG4gICAgICAgICAgICBuYW1lc3BhY2U6IFwiYXBwbWVzaC1zeXN0ZW1cIixcbiAgICAgICAgICAgIHZhbHVlczoge1xuICAgICAgICAgICAgICAgIFwicmVnaW9uXCI6IGNsdXN0ZXIuc3RhY2sucmVnaW9uLFxuICAgICAgICAgICAgICAgIFwic2VydmljZUFjY291bnQuY3JlYXRlXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgIFwic2VydmljZUFjY291bnQubmFtZVwiOiBcImFwcG1lc2gtY29udHJvbGxlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBjaGFydC5ub2RlLmFkZERlcGVuZGVuY3koc2EpO1xuICAgIH1cbn0iXX0=
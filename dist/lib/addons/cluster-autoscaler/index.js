"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterAutoScalerAddon = void 0;
const eks = require("@aws-cdk/aws-eks");
const aws_eks_1 = require("@aws-cdk/aws-eks");
const iam = require("@aws-cdk/aws-iam");
const core_1 = require("@aws-cdk/core");
class ClusterAutoScalerAddon {
    constructor(version) {
        /**
         * Version of the autoscaler, controls the image tag
         */
        this.versionMap = new Map([
            [aws_eks_1.KubernetesVersion.V1_19, "v1.19.1"],
            [aws_eks_1.KubernetesVersion.V1_18, "v1.18.3"],
            [aws_eks_1.KubernetesVersion.V1_17, "v1.17.4"]
        ]);
        this.versionField = version;
    }
    deploy(clusterInfo) {
        var _a;
        const version = (_a = this.versionField) !== null && _a !== void 0 ? _a : this.versionMap.get(clusterInfo.version);
        const cluster = clusterInfo.cluster;
        console.assert(clusterInfo.nodeGroup || clusterInfo.autoscalingGroup, "Cluster autoscaler is supported with EKS EC2 only");
        const ng = clusterInfo.nodeGroup || clusterInfo.autoscalingGroup;
        const autoscalerStmt = new iam.PolicyStatement();
        autoscalerStmt.addResources("*");
        autoscalerStmt.addActions("autoscaling:DescribeAutoScalingGroups", "autoscaling:DescribeAutoScalingInstances", "autoscaling:DescribeLaunchConfigurations", "autoscaling:DescribeTags", "autoscaling:SetDesiredCapacity", "autoscaling:TerminateInstanceInAutoScalingGroup", "ec2:DescribeLaunchTemplateVersions");
        const autoscalerPolicy = new iam.Policy(cluster.stack, "cluster-autoscaler-policy", {
            policyName: "ClusterAutoscalerPolicy",
            statements: [autoscalerStmt],
        });
        autoscalerPolicy.attachToRole(ng.role);
        const clusterName = new core_1.CfnJson(cluster.stack, "clusterName", {
            value: cluster.clusterName,
        });
        core_1.Tags.of(ng).add(`k8s.io/cluster-autoscaler/${clusterName}`, "owned", { applyToLaunchedInstances: true });
        core_1.Tags.of(ng).add("k8s.io/cluster-autoscaler/enabled", "true", { applyToLaunchedInstances: true });
        new eks.KubernetesManifest(cluster.stack, "cluster-autoscaler", {
            cluster,
            manifest: [
                {
                    apiVersion: "v1",
                    kind: "ServiceAccount",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            "k8s-addon": "cluster-autoscaler.addons.k8s.io",
                            "k8s-app": "cluster-autoscaler",
                        },
                    },
                },
                {
                    apiVersion: "rbac.authorization.k8s.io/v1",
                    kind: "ClusterRole",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            "k8s-addon": "cluster-autoscaler.addons.k8s.io",
                            "k8s-app": "cluster-autoscaler",
                        },
                    },
                    rules: [
                        {
                            apiGroups: [""],
                            resources: ["events", "endpoints"],
                            verbs: ["create", "patch"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["pods/eviction"],
                            verbs: ["create"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["pods/status"],
                            verbs: ["update"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["endpoints"],
                            resourceNames: ["cluster-autoscaler"],
                            verbs: ["get", "update"],
                        },
                        {
                            apiGroups: ["coordination.k8s.io"],
                            resources: ["leases"],
                            verbs: ["watch", "list", "get", "patch", "create", "update"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["nodes"],
                            verbs: ["watch", "list", "get", "update"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"],
                            verbs: ["watch", "list", "get"],
                        },
                        {
                            apiGroups: ["extensions"],
                            resources: ["replicasets", "daemonsets"],
                            verbs: ["watch", "list", "get"],
                        },
                        {
                            apiGroups: ["policy"],
                            resources: ["poddisruptionbudgets"],
                            verbs: ["watch", "list"],
                        },
                        {
                            apiGroups: ["apps"],
                            resources: ["statefulsets", "replicasets", "daemonsets"],
                            verbs: ["watch", "list", "get"],
                        },
                        {
                            apiGroups: ["storage.k8s.io"],
                            resources: ["storageclasses", "csinodes"],
                            verbs: ["watch", "list", "get"],
                        },
                        {
                            apiGroups: ["batch", "extensions"],
                            resources: ["jobs"],
                            verbs: ["get", "list", "watch", "patch"],
                        },
                    ],
                },
                {
                    apiVersion: "rbac.authorization.k8s.io/v1",
                    kind: "Role",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            "k8s-addon": "cluster-autoscaler.addons.k8s.io",
                            "k8s-app": "cluster-autoscaler",
                        },
                    },
                    rules: [
                        {
                            apiGroups: [""],
                            resources: ["configmaps"],
                            verbs: ["create", "list", "watch"],
                        },
                        {
                            apiGroups: [""],
                            resources: ["configmaps"],
                            resourceNames: ["cluster-autoscaler-status", "cluster-autoscaler-priority-expander"],
                            verbs: ["delete", "get", "update", "watch"],
                        },
                    ],
                },
                {
                    apiVersion: "rbac.authorization.k8s.io/v1",
                    kind: "ClusterRoleBinding",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            "k8s-addon": "cluster-autoscaler.addons.k8s.io",
                            "k8s-app": "cluster-autoscaler",
                        },
                    },
                    roleRef: {
                        apiGroup: "rbac.authorization.k8s.io",
                        kind: "ClusterRole",
                        name: "cluster-autoscaler",
                    },
                    subjects: [
                        {
                            kind: "ServiceAccount",
                            name: "cluster-autoscaler",
                            namespace: "kube-system",
                        },
                    ],
                },
                {
                    apiVersion: "rbac.authorization.k8s.io/v1",
                    kind: "RoleBinding",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            "k8s-addon": "cluster-autoscaler.addons.k8s.io",
                            "k8s-app": "cluster-autoscaler",
                        },
                    },
                    roleRef: {
                        apiGroup: "rbac.authorization.k8s.io",
                        kind: "Role",
                        name: "cluster-autoscaler",
                    },
                    subjects: [
                        {
                            kind: "ServiceAccount",
                            name: "cluster-autoscaler",
                            namespace: "kube-system",
                        },
                    ],
                },
                {
                    apiVersion: "apps/v1",
                    kind: "Deployment",
                    metadata: {
                        name: "cluster-autoscaler",
                        namespace: "kube-system",
                        labels: {
                            app: "cluster-autoscaler",
                        },
                        annotations: {
                            "cluster-autoscaler.kubernetes.io/safe-to-evict": "false",
                        },
                    },
                    spec: {
                        replicas: 1,
                        selector: {
                            matchLabels: {
                                app: "cluster-autoscaler",
                            },
                        },
                        template: {
                            metadata: {
                                labels: {
                                    app: "cluster-autoscaler",
                                },
                                annotations: {
                                    "prometheus.io/scrape": "true",
                                    "prometheus.io/port": "8085",
                                },
                            },
                            spec: {
                                serviceAccountName: "cluster-autoscaler",
                                containers: [
                                    {
                                        image: "k8s.gcr.io/autoscaling/cluster-autoscaler:" + version,
                                        name: "cluster-autoscaler",
                                        resources: {
                                            limits: {
                                                cpu: "100m",
                                                memory: "300Mi",
                                            },
                                            requests: {
                                                cpu: "100m",
                                                memory: "300Mi",
                                            },
                                        },
                                        command: [
                                            "./cluster-autoscaler",
                                            "--v=4",
                                            "--stderrthreshold=info",
                                            "--cloud-provider=aws",
                                            "--skip-nodes-with-local-storage=false",
                                            "--expander=least-waste",
                                            "--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/" +
                                                cluster.clusterName,
                                            "--balance-similar-node-groups",
                                            "--skip-nodes-with-system-pods=false",
                                        ],
                                        volumeMounts: [
                                            {
                                                name: "ssl-certs",
                                                mountPath: "/etc/ssl/certs/ca-certificates.crt",
                                                readOnly: true,
                                            },
                                        ],
                                        imagePullPolicy: "Always",
                                    },
                                ],
                                volumes: [
                                    {
                                        name: "ssl-certs",
                                        hostPath: {
                                            path: "/etc/ssl/certs/ca-bundle.crt",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            ],
        });
    }
}
exports.ClusterAutoScalerAddon = ClusterAutoScalerAddon;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvYWRkb25zL2NsdXN0ZXItYXV0b3NjYWxlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3Q0FBd0M7QUFDeEMsOENBQXFEO0FBQ3JELHdDQUF3QztBQUN4Qyx3Q0FBOEM7QUFHOUMsTUFBYSxzQkFBc0I7SUFJL0IsWUFBWSxPQUFnQjtRQUk1Qjs7V0FFRztRQUNNLGVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUMxQixDQUFDLDJCQUFpQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUM7WUFDcEMsQ0FBQywyQkFBaUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDO1lBQ3BDLENBQUMsMkJBQWlCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFWQyxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztJQUNoQyxDQUFDO0lBV0QsTUFBTSxDQUFDLFdBQXdCOztRQUUzQixNQUFNLE9BQU8sU0FBRyxJQUFJLENBQUMsWUFBWSxtQ0FBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUUsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUVwQyxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLElBQUksV0FBVyxDQUFDLGdCQUFnQixFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFFM0gsTUFBTSxFQUFFLEdBQUcsV0FBVyxDQUFDLFNBQVMsSUFBSSxXQUFXLENBQUMsZ0JBQWlCLENBQUM7UUFHbEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDakQsY0FBYyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQyxjQUFjLENBQUMsVUFBVSxDQUNyQix1Q0FBdUMsRUFDdkMsMENB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VyxFQUFFO29DQUNULHNCQUFzQixFQUFFLE1BQU07b0NBQzlCLG9CQUFvQixFQUFFLE1BQU07aUNBQy9COzZCQUNKOzRCQUNELElBQUksRUFBRTtnQ0FDRixrQkFBa0IsRUFBRSxvQkFBb0I7Z0NBQ3hDLFVBQVUsRUFBRTtvQ0FDUjt3Q0FDSSxLQUFLLEVBQUUsNENBQTRDLEdBQUcsT0FBTzt3Q0FDN0QsSUFBSSxFQUFFLG9CQUFvQjt3Q0FDMUIsU0FBUyxFQUFFOzRDQUNQLE1BQU0sRUFBRTtnREFDSixHQUFHLEVBQUUsTUFBTTtnREFDWCxNQUFNLEVBQUUsT0FBTzs2Q0FDbEI7NENBQ0QsUUFBUSxFQUFFO2dEQUNOLEdBQUcsRUFBRSxNQUFNO2dEQUNYLE1BQU0sRUFBRSxPQUFPOzZDQUNsQjt5Q0FDSjt3Q0FDRCxPQUFPLEVBQUU7NENBQ0wsc0JBQXNCOzRDQUN0QixPQUFPOzRDQUNQLHdCQUF3Qjs0Q0FDeEIsc0JBQXNCOzRDQUN0Qix1Q0FBdUM7NENBQ3ZDLHdCQUF3Qjs0Q0FDeEIsa0dBQWtHO2dEQUNsRyxPQUFPLENBQUMsV0FBVzs0Q0FDbkIsK0JBQStCOzRDQUMvQixxQ0FBcUM7eUNBQ3hDO3dDQUNELFlBQVksRUFBRTs0Q0FDVjtnREFDSSxJQUFJLEVBQUUsV0FBVztnREFDakIsU0FBUyxFQUFFLG9DQUFvQztnREFDL0MsUUFBUSxFQUFFLElBQUk7NkNBQ2pCO3lDQUNKO3dDQUNELGVBQWUsRUFBRSxRQUFRO3FDQUM1QjtpQ0FDSjtnQ0FDRCxPQUFPLEVBQUU7b0NBQ0w7d0NBQ0ksSUFBSSxFQUFFLFdBQVc7d0NBQ2pCLFFBQVEsRUFBRTs0Q0FDTixJQUFJLEVBQUUsOEJBQThCO3lDQUN2QztxQ0FDSjtpQ0FDSjs2QkFDSjt5QkFDSjtxQkFDSjtpQkFDSjthQUNKO1NBQ0osQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBeFNELHdEQXdTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGVrcyBmcm9tIFwiQGF3cy1jZGsvYXdzLWVrc1wiO1xuaW1wb3J0IHsgS3ViZXJuZXRlc1ZlcnNpb24gfSBmcm9tIFwiQGF3cy1jZGsvYXdzLWVrc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJAYXdzLWNkay9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDZm5Kc29uLCBUYWdzIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCB7IENsdXN0ZXJBZGRPbiwgQ2x1c3RlckluZm8gfSBmcm9tIFwiLi4vLi4vc3RhY2tzL2Vrcy1ibHVlcHJpbnQtc3RhY2tcIjtcblxuZXhwb3J0IGNsYXNzIENsdXN0ZXJBdXRvU2NhbGVyQWRkb24gaW1wbGVtZW50cyBDbHVzdGVyQWRkT24ge1xuXG4gICAgcHJpdmF0ZSB2ZXJzaW9uRmllbGQ/OiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3Rvcih2ZXJzaW9uPzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMudmVyc2lvbkZpZWxkID0gdmVyc2lvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBWZXJzaW9uIG9mIHRoZSBhdXRvc2NhbGVyLCBjb250cm9scyB0aGUgaW1hZ2UgdGFnXG4gICAgICovXG4gICAgcmVhZG9ubHkgdmVyc2lvbk1hcCA9IG5ldyBNYXAoW1xuICAgICAgICBbS3ViZXJuZXRlc1ZlcnNpb24uVjFfMTksIFwidjEuMTkuMVwiXSxcbiAgICAgICAgW0t1YmVybmV0ZXNWZXJzaW9uLlYxXzE4LCBcInYxLjE4LjNcIl0sXG4gICAgICAgIFtLdWJlcm5ldGVzVmVyc2lvbi5WMV8xNywgXCJ2MS4xNy40XCJdXG4gICAgXSk7XG5cbiAgICBkZXBsb3koY2x1c3RlckluZm86IENsdXN0ZXJJbmZvKTogdm9pZCB7XG5cbiAgICAgICAgY29uc3QgdmVyc2lvbiA9IHRoaXMudmVyc2lvbkZpZWxkID8/IHRoaXMudmVyc2lvbk1hcC5nZXQoY2x1c3RlckluZm8udmVyc2lvbik7XG4gICAgICAgIGNvbnN0IGNsdXN0ZXIgPSBjbHVzdGVySW5mby5jbHVzdGVyO1xuXG4gICAgICAgIGNvbnNvbGUuYXNzZXJ0KGNsdXN0ZXJJbmZvLm5vZGVHcm91cCB8fCBjbHVzdGVySW5mby5hdXRvc2NhbGluZ0dyb3VwLCBcIkNsdXN0ZXIgYXV0b3NjYWxlciBpcyBzdXBwb3J0ZWQgd2l0aCBFS1MgRUMyIG9ubHlcIik7XG5cbiAgICAgICAgY29uc3QgbmcgPSBjbHVzdGVySW5mby5ub2RlR3JvdXAgfHwgY2x1c3RlckluZm8uYXV0b3NjYWxpbmdHcm91cCE7XG5cblxuICAgICAgICBjb25zdCBhdXRvc2NhbGVyU3RtdCA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KCk7XG4gICAgICAgIGF1dG9zY2FsZXJTdG10LmFkZFJlc291cmNlcyhcIipcIik7XG4gICAgICAgIGF1dG9zY2FsZXJTdG10LmFkZEFjdGlvbnMoXG4gICAgICAgICAgICBcImF1dG9zY2FsaW5nOkRlc2NyaWJlQXV0b1NjYWxpbmdHcm91cHNcIixcbiAgICAgICAgICAgIFwiYXV0b3NjYWxpbmc6RGVzY3JpYmVBdXRvU2NhbGluZ0luc3RhbmNlc1wiLFxuICAgICAgICAgICAgXCJhdXRvc2NhbGluZzpEZXNjcmliZUxhdW5jaENvbmZpZ3VyYXRpb25zXCIsXG4gICAgICAgICAgICBcImF1dG9zY2FsaW5nOkRlc2NyaWJlVGFnc1wiLFxuICAgICAgICAgICAgXCJhdXRvc2NhbGluZzpTZXREZXNpcmVkQ2FwYWNpdHlcIixcbiAgICAgICAgICAgIFwiYXV0b3NjYWxpbmc6VGVybWluYXRlSW5zdGFuY2VJbkF1dG9TY2FsaW5nR3JvdXBcIixcbiAgICAgICAgICAgIFwiZWMyOkRlc2NyaWJlTGF1bmNoVGVtcGxhdGVWZXJzaW9uc1wiXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGF1dG9zY2FsZXJQb2xpY3kgPSBuZXcgaWFtLlBvbGljeShjbHVzdGVyLnN0YWNrLCBcImNsdXN0ZXItYXV0b3NjYWxlci1wb2xpY3lcIiwge1xuICAgICAgICAgICAgcG9saWN5TmFtZTogXCJDbHVzdGVyQXV0b3NjYWxlclBvbGljeVwiLFxuICAgICAgICAgICAgc3RhdGVtZW50czogW2F1dG9zY2FsZXJTdG10XSxcbiAgICAgICAgfSk7XG4gICAgICAgIGF1dG9zY2FsZXJQb2xpY3kuYXR0YWNoVG9Sb2xlKG5nLnJvbGUpO1xuXG4gICAgICAgIGNvbnN0IGNsdXN0ZXJOYW1lID0gbmV3IENmbkpzb24oY2x1c3Rlci5zdGFjaywgXCJjbHVzdGVyTmFtZVwiLCB7XG4gICAgICAgICAgICB2YWx1ZTogY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgfSk7XG4gICAgICAgIFRhZ3Mub2YobmcpLmFkZChgazhzLmlvL2NsdXN0ZXItYXV0b3NjYWxlci8ke2NsdXN0ZXJOYW1lfWAsIFwib3duZWRcIiwgeyBhcHBseVRvTGF1bmNoZWRJbnN0YW5jZXM6IHRydWUgfSk7XG4gICAgICAgIFRhZ3Mub2YobmcpLmFkZChcIms4cy5pby9jbHVzdGVyLWF1dG9zY2FsZXIvZW5hYmxlZFwiLCBcInRydWVcIiwgeyBhcHBseVRvTGF1bmNoZWRJbnN0YW5jZXM6IHRydWUgfSk7XG5cbiAgICAgICAgbmV3IGVrcy5LdWJlcm5ldGVzTWFuaWZlc3QoY2x1c3Rlci5zdGFjaywgXCJjbHVzdGVyLWF1dG9zY2FsZXJcIiwge1xuICAgICAgICAgICAgY2x1c3RlcixcbiAgICAgICAgICAgIG1hbmlmZXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhcGlWZXJzaW9uOiBcInYxXCIsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiU2VydmljZUFjY291bnRcIixcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiazhzLWFkZG9uXCI6IFwiY2x1c3Rlci1hdXRvc2NhbGVyLmFkZG9ucy5rOHMuaW9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIms4cy1hcHBcIjogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb246IFwicmJhYy5hdXRob3JpemF0aW9uLms4cy5pby92MVwiLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBcIkNsdXN0ZXJSb2xlXCIsXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiBcImt1YmUtc3lzdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIms4cy1hZGRvblwiOiBcImNsdXN0ZXItYXV0b3NjYWxlci5hZGRvbnMuazhzLmlvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJrOHMtYXBwXCI6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wiZXZlbnRzXCIsIFwiZW5kcG9pbnRzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJzOiBbXCJjcmVhdGVcIiwgXCJwYXRjaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpR3JvdXBzOiBbXCJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCJwb2RzL2V2aWN0aW9uXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJzOiBbXCJjcmVhdGVcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wicG9kcy9zdGF0dXNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYnM6IFtcInVwZGF0ZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpR3JvdXBzOiBbXCJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCJlbmRwb2ludHNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VOYW1lczogW1wiY2x1c3Rlci1hdXRvc2NhbGVyXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJzOiBbXCJnZXRcIiwgXCJ1cGRhdGVcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiY29vcmRpbmF0aW9uLms4cy5pb1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcImxlYXNlc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiczogW1wid2F0Y2hcIiwgXCJsaXN0XCIsIFwiZ2V0XCIsIFwicGF0Y2hcIiwgXCJjcmVhdGVcIiwgXCJ1cGRhdGVcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wibm9kZXNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYnM6IFtcIndhdGNoXCIsIFwibGlzdFwiLCBcImdldFwiLCBcInVwZGF0ZVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpR3JvdXBzOiBbXCJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCJwb2RzXCIsIFwic2VydmljZXNcIiwgXCJyZXBsaWNhdGlvbmNvbnRyb2xsZXJzXCIsIFwicGVyc2lzdGVudHZvbHVtZWNsYWltc1wiLCBcInBlcnNpc3RlbnR2b2x1bWVzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJzOiBbXCJ3YXRjaFwiLCBcImxpc3RcIiwgXCJnZXRcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiZXh0ZW5zaW9uc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcInJlcGxpY2FzZXRzXCIsIFwiZGFlbW9uc2V0c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiczogW1wid2F0Y2hcIiwgXCJsaXN0XCIsIFwiZ2V0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlHcm91cHM6IFtcInBvbGljeVwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcInBvZGRpc3J1cHRpb25idWRnZXRzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJzOiBbXCJ3YXRjaFwiLCBcImxpc3RcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwczogW1wiYXBwc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcInN0YXRlZnVsc2V0c1wiLCBcInJlcGxpY2FzZXRzXCIsIFwiZGFlbW9uc2V0c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiczogW1wid2F0Y2hcIiwgXCJsaXN0XCIsIFwiZ2V0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlHcm91cHM6IFtcInN0b3JhZ2UuazhzLmlvXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogW1wic3RvcmFnZWNsYXNzZXNcIiwgXCJjc2lub2Rlc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJiczogW1wid2F0Y2hcIiwgXCJsaXN0XCIsIFwiZ2V0XCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlHcm91cHM6IFtcImJhdGNoXCIsIFwiZXh0ZW5zaW9uc1wiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcImpvYnNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYnM6IFtcImdldFwiLCBcImxpc3RcIiwgXCJ3YXRjaFwiLCBcInBhdGNoXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJrOHMtYWRkb25cIjogXCJjbHVzdGVyLWF1dG9zY2FsZXIuYWRkb25zLms4cy5pb1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiazhzLWFwcFwiOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlHcm91cHM6IFtcIlwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcImNvbmZpZ21hcHNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYnM6IFtcImNyZWF0ZVwiLCBcImxpc3RcIiwgXCJ3YXRjaFwiXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpR3JvdXBzOiBbXCJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCJjb25maWdtYXBzXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlTmFtZXM6IFtcImNsdXN0ZXItYXV0b3NjYWxlci1zdGF0dXNcIiwgXCJjbHVzdGVyLWF1dG9zY2FsZXItcHJpb3JpdHktZXhwYW5kZXJcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyYnM6IFtcImRlbGV0ZVwiLCBcImdldFwiLCBcInVwZGF0ZVwiLCBcIndhdGNoXCJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiQ2x1c3RlclJvbGVCaW5kaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlOiBcImt1YmUtc3lzdGVtXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIms4cy1hZGRvblwiOiBcImNsdXN0ZXItYXV0b3NjYWxlci5hZGRvbnMuazhzLmlvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJrOHMtYXBwXCI6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByb2xlUmVmOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcGlHcm91cDogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBcIkNsdXN0ZXJSb2xlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzdWJqZWN0czogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiU2VydmljZUFjY291bnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogXCJrdWJlLXN5c3RlbVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVmVyc2lvbjogXCJyYmFjLmF1dGhvcml6YXRpb24uazhzLmlvL3YxXCIsXG4gICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiUm9sZUJpbmRpbmdcIixcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiazhzLWFkZG9uXCI6IFwiY2x1c3Rlci1hdXRvc2NhbGVyLmFkZG9ucy5rOHMuaW9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIms4cy1hcHBcIjogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJvbGVSZWY6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwaUdyb3VwOiBcInJiYWMuYXV0aG9yaXphdGlvbi5rOHMuaW9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGtpbmQ6IFwiUm9sZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc3ViamVjdHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBraW5kOiBcIlNlcnZpY2VBY2NvdW50XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVZlcnNpb246IFwiYXBwcy92MVwiLFxuICAgICAgICAgICAgICAgICAgICBraW5kOiBcIkRlcGxveW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IFwia3ViZS1zeXN0ZW1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcDogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhbm5vdGF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiY2x1c3Rlci1hdXRvc2NhbGVyLmt1YmVybmV0ZXMuaW8vc2FmZS10by1ldmljdFwiOiBcImZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzcGVjOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsaWNhczogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hMYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwcDogXCJjbHVzdGVyLWF1dG9zY2FsZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW5ub3RhdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJvbWV0aGV1cy5pby9zY3JhcGVcIjogXCJ0cnVlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb21ldGhldXMuaW8vcG9ydFwiOiBcIjgwODVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNwZWM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VydmljZUFjY291bnROYW1lOiBcImNsdXN0ZXItYXV0b3NjYWxlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IFwiazhzLmdjci5pby9hdXRvc2NhbGluZy9jbHVzdGVyLWF1dG9zY2FsZXI6XCIgKyB2ZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3B1OiBcIjEwMG1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lbW9yeTogXCIzMDBNaVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3B1OiBcIjEwMG1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lbW9yeTogXCIzMDBNaVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIi4vY2x1c3Rlci1hdXRvc2NhbGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLS12PTRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCItLXN0ZGVycnRocmVzaG9sZD1pbmZvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLS1jbG91ZC1wcm92aWRlcj1hd3NcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCItLXNraXAtbm9kZXMtd2l0aC1sb2NhbC1zdG9yYWdlPWZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiLS1leHBhbmRlcj1sZWFzdC13YXN0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIi0tbm9kZS1ncm91cC1hdXRvLWRpc2NvdmVyeT1hc2c6dGFnPWs4cy5pby9jbHVzdGVyLWF1dG9zY2FsZXIvZW5hYmxlZCxrOHMuaW8vY2x1c3Rlci1hdXRvc2NhbGVyL1wiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCItLWJhbGFuY2Utc2ltaWxhci1ub2RlLWdyb3Vwc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIi0tc2tpcC1ub2Rlcy13aXRoLXN5c3RlbS1wb2RzPWZhbHNlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b2x1bWVNb3VudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJzc2wtY2VydHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1vdW50UGF0aDogXCIvZXRjL3NzbC9jZXJ0cy9jYS1jZXJ0aWZpY2F0ZXMuY3J0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGltYWdlUHVsbFBvbGljeTogXCJBbHdheXNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZvbHVtZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBcInNzbC1jZXJ0c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3RQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IFwiL2V0Yy9zc2wvY2VydHMvY2EtYnVuZGxlLmNydFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KTtcbiAgICB9XG59Il19
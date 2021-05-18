export class DefaultTeamRoles {

    createManifest(namespace: string): Record<string, any>[] {
        return [
            {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "ClusterRole",
                metadata: {
                    name: `${namespace}-team-cluster-role`
                },
                rules: [
                    {
                        apiGroups: [
                            ""
                        ],
                        resources: [
                            "nodes",
                            "namespaces"
                        ],
                        verbs: [
                            "get",
                            "list"
                        ]
                    }
                ]
            },
            {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "ClusterRoleBinding",
                metadata: {
                    name: `${namespace}-team-cluster-role-binding`
                },
                subjects: [
                    {
                        kind: "Group",
                        name: `${namespace}-team-group`,
                        apiGroup: "rbac.authorization.k8s.io"
                    }
                ],
                roleRef: {
                    kind: "ClusterRole",
                    name: `${namespace}-team-cluster-role`,
                    apiGroup: "rbac.authorization.k8s.io"
                }
            },
            {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "Role",
                metadata: {
                    namespace: namespace,
                    name: `${namespace}-team-role`
                },
                rules: [
                    {
                        apiGroups: [
                            ""
                        ],
                        resources: [
                            "pods"
                        ],
                        verbs: [
                            "get",
                            "list"
                        ]
                    },
                    {
                        apiGroups: [
                            "apps"
                        ],
                        resources: [
                            "deployments",
                            "daemonsets",
                            "statefulsets",
                            "replicasets"
                        ],
                        verbs: [
                            "get",
                            "list"
                        ]
                    },
                    {
                        apiGroups: [
                            "batch"
                        ],
                        resources: [
                            "jobs"
                        ],
                        verbs: [
                            "get",
                            "list"
                        ]
                    }
                ]
            },
            {
                apiVersion: "rbac.authorization.k8s.io/v1",
                kind: "RoleBinding",
                metadata: {
                    name: `${namespace}-team-role-binding`,
                    namespace: namespace
                },
                subjects: [
                    {
                        kind: "Group",
                        name: `${namespace}-team-group`,
                        apiGroup: "rbac.authorization.k8s.io"
                    }
                ],
                roleRef: {
                    kind: "Role",
                    name: `${namespace}-team-role`,
                    apiGroup: "rbac.authorization.k8s.io"
                }
            }
        ]

    }
}

export class NeuronMonitorManifest {

    constructor() {}

    public generate(namespace: string, imageTag: string, port: number) {
        
        const deamonSetManifest = {
            apiVersion: "apps/v1",
            kind: "DaemonSet",
            metadata: {
                name: "neuron-monitor",
                namespace: namespace,
                labels: {
                    app: "neuron-monitor",
                    role: "master"
                }
            },
            spec: {
                selector: {
                    matchLabels: {
                        app: "neuron-monitor",
                        role: "master"
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            app: "neuron-monitor",
                            role: "master"
                        }
                    },
                    spec: {
                        containers: [{
                            name: "app",
                            image: `public.ecr.aws/g4h4h0b5/neuron-monitor:${imageTag}`,
                            command: ["/bin/sh"],
                            args: ["-c", `neuron-monitor | neuron-monitor-prometheus.py --port ${port}`],
                            ports: [{
                                name: "prom-node-exp",
                                containerPort: port,
                                hostPort: port
                            }],
                            volumeMounts: [{
                                name: "dev",
                                mountPath: "/dev"
                            }],
                            securityContext: {
                                privileged: true
                            }
                        }],
                        tolerations: [{
                            key: "aws.amazon.com/neuron",
                            operator: "Exists",
                            effect: "NoSchedule"
                        }],
                        affinity: {
                            nodeAffinity: {
                                requiredDuringSchedulingIgnoredDuringExecution: {
                                    nodeSelectorTerms: [{
                                        matchExpressions: [{
                                            key: "node.kubernetes.io/instance-type",
                                            operator: "In",
                                            values: [
                                                "inf1.xlarge", "inf1.2xlarge", "inf1.6xlarge", "inf1.24xlarge",
                                                "inf2.xlarge", "inf2.4xlarge", "inf2.8xlarge", "inf2.24xlarge", "inf2.48xlarge",
                                                "trn1.2xlarge", "trn1.32xlarge", "trn1n.32xlarge"
                                            ]
                                        }]
                                    }]
                                }
                            }
                        },
                        volumes: [{
                            name: "dev",
                            hostPath: {
                                path: "/dev"
                            }
                        }],
                        restartPolicy: "Always"
                    }
                }
            }
        };
        
        const serviceManifest = {
            apiVersion: "v1",
            kind: "Service",
            metadata: {
                annotations: {
                    "prometheus.io/scrape": "true",
                    "prometheus.io/app-metrics": "true",
                    "prometheus.io/port": port.toString()
                },
                name: "neuron-monitor",
                namespace: namespace,
                labels: {
                    app: "neuron-monitor"
                }
            },
            spec: {
                clusterIP: "None",
                ports: [{
                    name: "neuron-monitor",
                    port: port,
                    protocol: "TCP"
                }],
                selector: {
                    app: "neuron-monitor"
                },
                type: "ClusterIP"
            }
        };
        
        const manifest = [deamonSetManifest, serviceManifest];
        return manifest;
    }
}

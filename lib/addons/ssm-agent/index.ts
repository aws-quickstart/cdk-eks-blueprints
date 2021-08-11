import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { ClusterAddOn, ClusterInfo } from "../../spi";

export class SSMAgentAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        console.assert(clusterInfo.nodeGroup || clusterInfo.autoscalingGroup, "SSMAgentAddon can only be used with EKS EC2 at the moment. "
            + "If using customer cluster provider, make sure you return the node group");

        // Setup managed policy.
        const nodeGroup = clusterInfo.nodeGroup || clusterInfo.autoscalingGroup;
        // Add AWS Managed Policy for SSM
        nodeGroup!.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

        // Apply manifest.
        // See APG Pattern https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/install-ssm-agent-on-amazon-eks-worker-nodes-by-using-kubernetes-daemonset.html
        const appLabel = { app: "ssm-installer"};

        const daemonSet = {
            apiVersion: "apps/v1",
            kind: "DaemonSet",
            metadata: {
                name: "ssm-installer",
            },
            spec: {
                selector: { matchLabels: appLabel },
                updateStrategy: { type: "RollingUpdate" },
                template: {
                    metadata: { labels: appLabel },
                    spec: {
                        containers: [
                            {
                                name: "pause",
                                image: "gcr.io/google_containers/pause",
                                resources: {
                                    limits: {
                                        cpu: "100m",
                                        memory: "128Mi",
                                    },
                                    requests: {
                                        cpu: "100m",
                                        memory: "128Mi",
                                    },
                                }
                            }
                        ],
                        initContainers: [
                            {
                                image: "public.ecr.aws/y9z4e3w0/eks-ssp-test/addon-ssm-agent:3.0.1390.0",
                                imagePullPolicy: "Always",
                                name: "ssm-install",
                                securityContext: {
                                    allowPrivilegeEscalation: true
                                },
                                volumeMounts: [
                                    {
                                        mountPath: "/etc/cron.d",
                                        name: "cronfile"
                                    }
                                ],
                                resources: {
                                    limits: {
                                        cpu: "100m",
                                        memory: "256Mi",
                                    },
                                    requests: {
                                        cpu: "100m",
                                        memory: "256Mi",
                                    },
                                },
                                terminationMessagePath: "/dev/termination.log",
                                terminationMessagePolicy: "File",
                            }
                        ],
                        volumes: [
                            {
                                name: "cronfile",
                                hostPath: {
                                    path: "/etc/cron.d",
                                    type: "Directory"
                                }
                            }
                        ],
                        dnsPolicy: "ClusterFirst",
                        restartPolicy: "Always",
                        schedulerName: "default-scheduler",
                        terminationGracePeriodSeconds: 30
                    }
                }
            }
        };

        new KubernetesManifest(cluster.stack, "ssm-agent", {
            cluster,
            manifest: [daemonSet]
        });
    }
}
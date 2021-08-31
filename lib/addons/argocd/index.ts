import bcrypt = require('bcrypt');
import { Construct } from "@aws-cdk/core";
import { HelmChart, KubernetesManifest, ServiceAccount } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";

import * as spi from "../../spi";
import { getSecretValue } from '../../utils/secrets-manager-utils';
import { sshRepoRef, userNameRepoRef } from './manifest-utils';
import { btoa } from '../../utils/string-utils';
import { Constants } from "..";

/**
 * Configuration options for add-on.
 */
export interface ArgoCDAddOnProps {
    /**
     * Namespace where add-on will be deployed. 
     * @default argocd
     */
    namespace?: string;

    /**
    * Helm chart version to use to install.
    * @default 3.17.5
    */
    chartVersion?: string;

    /**
     * If provided, the addon will bootstrap the app or apps in the provided repository.
     * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
     * after the infrastructure and team provisioning is complete. 
     */
    bootstrapRepo?: spi.ApplicationRepository;

    /**
     * Optional admin password secret (plaintext).
     * This allows to control admin password across the enterprise. Password will be retrieved and 
     * store as bcrypt hash. 
     * Note: at present, change of password will require manual restart of argocd server. 
     */
    adminPasswordSecretName?: string;

    /**
     * Values to pass to the chart as per https://github.com/argoproj/argo-helm/blob/master/charts/argo-cd/values.yaml.
     */
    values?: {
        [key: string]: any;
    };
}

/**
 * Defaults options for the add-on
 */
const defaultProps: ArgoCDAddOnProps = {
    namespace: "argocd",
    chartVersion: '3.17.5'
};

/**
 * Implementation of ArgoCD add-on and post deployment hook.
 */
export class ArgoCDAddOn implements spi.ClusterAddOn, spi.ClusterPostDeploy {

    readonly options: ArgoCDAddOnProps;

    private chartNode: HelmChart;

    constructor(props?: ArgoCDAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    /**
     * Implementation of the add-on contract deploy method.
    */
    async deploy(clusterInfo: spi.ClusterInfo): Promise<Construct> {
        const namespace = this.createNamespace(clusterInfo);

        const sa = this.createServiceAccount(clusterInfo);
        sa.node.addDependency(namespace);

        const repo = await this.createSecretKey(clusterInfo, namespace);

        const values = this.options.values ?? {
            server: {
                serviceAccount: {
                    create: false
                },
                config: {
                    repositories: repo
                }
            }
        };

        if (this.options.adminPasswordSecretName) {
            const adminSecret = await this.createAdminSecret(clusterInfo.cluster.stack.region);
            values['configs'] = {
                secret: {
                    argocdServerAdminPassword: adminSecret
                }
            };
        }

        this.chartNode = clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            release: Constants.SSP_ADDON,
            repository: "https://argoproj.github.io/argo-helm",
            version: this.options.chartVersion,
            namespace: this.options.namespace,
            values: values
        });

        this.chartNode.node.addDependency(sa);
        return this.chartNode;
    }


    /**
     * Post deployment step is used to create a bootstrap repository if options are provided for the add-on.
     * @param clusterInfo 
     * @param teams 
     * @returns 
     */
    async postDeploy(clusterInfo: spi.ClusterInfo, teams: spi.Team[]) {
        console.assert(teams != null);
        const appRepo = this.options.bootstrapRepo;

        if (!appRepo) {
            return;
        }

        const manifest = new KubernetesManifest(clusterInfo.cluster.stack, "bootstrap-app", {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: "argoproj.io/v1alpha1",
                kind: "Application",
                metadata: {
                    name: appRepo.name ?? "bootstrap-apps",
                    namespace: this.options.namespace
                },
                spec: {
                    destination: {
                        namespace: this.options.namespace,
                        server: "https://kubernetes.default.svc"
                    },
                    project: "default",
                    source: {
                        helm: {
                            valueFiles: ["values.yaml"]
                        },
                        path: appRepo.path,
                        repoURL: appRepo.repoUrl,
                        targetRevision: appRepo.targetRevision ?? 'HEAD'
                    },
                    syncPolicy: {
                        automated: {}
                    }
                }
            }],
            overwrite: true,
            prune: true
        });
        //
        // Make sure the bootstrap is only applied after successful ArgoCD installation.
        //
        manifest.node.addDependency(this.chartNode);
    }

    /**
     * @returns bcrypt hash of the admin secret provided from the AWS secret manager.
     */
    protected async createAdminSecret(region: string): Promise<string> {
        const secretValue = await getSecretValue(this.options.adminPasswordSecretName!, region);
        return bcrypt.hash(secretValue, 10);
    }

    /**
     * Creates namespace, which is a prerequisite for service account creation and subsequent chart execution.
     * @param clusterInfo 
     * @returns 
    */
    protected createNamespace(clusterInfo: spi.ClusterInfo): KubernetesManifest {
        return new KubernetesManifest(clusterInfo.cluster.stack, "argo-namespace-struct", {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: this.options.namespace,
                }
            }],
            overwrite: true,
            prune: true
        });
    }

    /**
     * Creates a secret key 
     * @param clusterInfo 
     * @param secretName 
     * @param dependency dependency for the created secret to control order of execution 
     * @returns reference to the secret to add to the ArgoCD config map
     */
    protected async createSecretKey(clusterInfo: spi.ClusterInfo, dependency: KubernetesManifest): Promise<string> {

        const secretName = this.options.bootstrapRepo?.credentialsSecretName;
        if (!secretName) {
            return "";
        }

        const appRepo = this.options.bootstrapRepo!;
        let credentials = { url: btoa(appRepo.repoUrl) };

        const secretValue = await getSecretValue(secretName, clusterInfo.cluster.stack.region);

        let result = "";

        switch (appRepo?.credentialsType) {
            case "SSH":
                credentials = { ...credentials, ...{ sshPrivateKey: btoa(secretValue) } };
                result = sshRepoRef(appRepo.repoUrl, secretName);
                break;
            case "USERNAME":
            case "TOKEN":
                // eslint-disable-next-line no-case-declarations
                const secretJson: any = JSON.parse(secretValue);
                credentials = {
                    ...credentials, ...{
                        username: btoa(secretJson["username"]),
                        password: btoa(secretJson["password"])
                    }
                };
                result = userNameRepoRef(appRepo.repoUrl, secretName);
                break;
        }

        const manifest = new KubernetesManifest(clusterInfo.cluster.stack, "argo-bootstrap-secret", {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: "v1",
                kind: "Secret",
                metadata: {
                    name: secretName,
                    namespace: this.options.namespace,
                    labels: {
                        "argocd.argoproj.io/secret-type": "repo-creds"
                    }
                },
                data: credentials,
            }],
            overwrite: true,
        });

        manifest.node.addDependency(dependency);
        return result;
    }

    /**
     * Creates a service account that can access secrets
     * @param clusterInfo 
     * @returns 
     */
    protected createServiceAccount(clusterInfo: spi.ClusterInfo): ServiceAccount {
        const sa = clusterInfo.cluster.addServiceAccount('argo-cd-server', {
            name: "argocd-server",
            namespace: this.options.namespace
        });

        const secretPolicy = ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite");
        sa.role.addManagedPolicy(secretPolicy);
        return sa;
    }
}
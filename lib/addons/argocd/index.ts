import bcrypt = require('bcrypt');
import { HelmChart, KubernetesManifest, ServiceAccount } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { Construct } from "@aws-cdk/core";
import merge from "ts-deepmerge";
import * as spi from "../../spi";
import { btoa, getSecretValue } from '../../utils';
import { HelmAddOnUserProps } from '../helm-addon';
import { ArgoApplication } from './application';
import { sshRepoRef, userNameRepoRef } from './manifest-utils';


/**
 * Configuration options for add-on.
 */
export interface ArgoCDAddOnProps extends HelmAddOnUserProps {
    /**
     * Namespace where add-on will be deployed. 
     * @default argocd
     */
    namespace?: string;

    /**
    * Helm chart version to use to install.
    * @default 3.27.1
    */
    version?: string;

    /**
     * If provided, the addon will bootstrap the app or apps in the provided repository.
     * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
     * after the infrastructure and team provisioning is complete. 
     */
    bootstrapRepo?: spi.ApplicationRepository;

    /**
     * Optional values for the bootstrap application.
     */
    bootstrapValues?: spi.Values,

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
const defaultProps = {
    namespace: "argocd",
    version: '3.27.1',
    chart: "argo-cd",
    release: "ssp-addon-argocd",
    repository: "https://argoproj.github.io/argo-helm"
};


/**
 * Implementation of ArgoCD add-on and post deployment hook.
 */
export class ArgoCDAddOn implements spi.ClusterAddOn, spi.ClusterPostDeploy {

    readonly options: ArgoCDAddOnProps;

    private chartNode?: HelmChart;

    constructor(props?: ArgoCDAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    generate(clusterInfo: spi.ClusterInfo, deployment: spi.GitOpsApplicationDeployment, wave = 0): Construct {
        const promise = clusterInfo.getScheduledAddOn('ArgoCDAddOn');
        if (promise === undefined) {
            throw new Error("ArgoCD addon must be registered before creating Argo managed add-ons for helm applications");
        }
        const manifest = new ArgoApplication(this.options.bootstrapRepo).generate(deployment, wave);
        const construct = clusterInfo.cluster.addManifest(deployment.name, manifest);
        promise.then(chart => {
            construct.node.addDependency(chart);
        });

        return construct;
    }

    /**
     * Implementation of the add-on contract deploy method.
    */
    async deploy(clusterInfo: spi.ClusterInfo): Promise<Construct> {
        const namespace = this.createNamespace(clusterInfo);

        const sa = this.createServiceAccount(clusterInfo);
        sa.node.addDependency(namespace);

        const bootstrapRepo = await this.createSecretKey(clusterInfo, namespace);

        const defaultValues = {
            server: {
                serviceAccount: {
                    create: false
                },
                config: {
                    repositories: bootstrapRepo
                }
            }
        };

        let values = merge(defaultValues, this.options.values ?? {});

        if (this.options.adminPasswordSecretName) {
            const adminSecret = await this.createAdminSecret(clusterInfo.cluster.stack.region);
            values = merge(
                {
                    configs: {
                        secret: {
                            argocdServerAdminPassword: adminSecret
                        }
                    }
                }, values);
        }

        this.chartNode = clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: this.options.chart!,
            release: this.options.release,
            repository: this.options.repository,
            version: this.options.version,
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

        if (appRepo) {
            this.generate(clusterInfo, {
                name: appRepo.name ?? "bootstrap-apps",
                namespace: this.options.namespace!,
                repository: appRepo,
                values: this.options.bootstrapValues ?? {}
            });
        }
        this.chartNode = undefined;
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
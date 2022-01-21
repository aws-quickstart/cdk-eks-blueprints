import bcrypt = require('bcrypt');
import { SecretProviderClass } from '..';
import { SecretsStoreAddOn } from '../secrets-store';
import { HelmChart, ServiceAccount } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { Construct } from "@aws-cdk/core";
import merge from "ts-deepmerge";
import * as spi from "../../spi";
import { createNamespace, dependable, getSecretValue, setPath } from '../../utils';
import { HelmAddOnUserProps } from '../helm-addon';
import { ArgoApplication } from './application';
import { createSecretRef } from './manifest-utils';



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
    values?: spi.Values;
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
    @dependable(SecretsStoreAddOn.name)
    async deploy(clusterInfo: spi.ClusterInfo): Promise<Construct> {
        const namespace = createNamespace(this.options.namespace!, clusterInfo.cluster, true);

        const sa = this.createServiceAccount(clusterInfo);
        sa.node.addDependency(namespace);

        let secretProviderClass: SecretProviderClass | undefined;

        if (this.options.bootstrapRepo?.credentialsSecretName) {
            const repo = this.options.bootstrapRepo;
            const secretProps = createSecretRef(repo.credentialsType!, repo.credentialsSecretName!);
            secretProviderClass = new SecretProviderClass(clusterInfo, sa, 'ssp-app-bootsrap-secret', secretProps);
        }

        const defaultValues: spi.Values = {};
        setPath(defaultValues, "server.serviceAccount.create", false);

        if (this.options.bootstrapRepo) {
            const repo = this.options.bootstrapRepo!;
            setPath(defaultValues, "configs.repositories.bootstrap", { url: repo.repoUrl });
        }

        let values = merge(defaultValues, this.options.values ?? {});

        if (this.options.adminPasswordSecretName) {
            const adminSecret = await this.createAdminSecret(clusterInfo.cluster.stack.region);
            setPath(values, "configs.secret.argocdServerAdminPassword", adminSecret);
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

        if (secretProviderClass) {
            secretProviderClass.addDependent(this.chartNode);
        }

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
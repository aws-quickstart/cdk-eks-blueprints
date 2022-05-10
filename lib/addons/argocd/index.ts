import { HelmChart, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { Stack } from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as assert from "assert";
import * as bcrypt from "bcrypt";
import * as dot from 'dot-object';
import merge from "ts-deepmerge";
import { SecretProviderClass } from '..';
import * as spi from "../../spi";
import { createNamespace, getSecretValue } from '../../utils';
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
    * @default 3.33.5
    */
    version?: string;

    /**
     * If provided, the addon will bootstrap the app or apps in the provided repository.
     * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
     * after the infrastructure and team provisioning is complete.
     * When GitOps mode is enabled via `ArgoGitOpsFactory` for deploying the AddOns, this bootstrap
     * repository will be used for provisioning all `HelmAddOn` based AddOns.
     */
    bootstrapRepo?: spi.ApplicationRepository;

    /**
     * Optional values for the bootstrap application. These may contain values such as domain named provisioned by other add-ons, certificate, and other parameters to pass 
     * to the applications. 
     */
    bootstrapValues?: spi.Values,


    /**
     * Additional application deployment repositories. If there is a split between infra and application repositories then
     * bootstrap repo is expected to be leveraged for infrastructure and application deployments will contain additional applications.
     */
    applicationRepos?: spi.GitOpsApplicationDeployment[],

    /**
     * Optional admin password secret name as defined in AWS Secrets Manager (plaintext).
     * This allows to control admin password across the enterprise. Password will be retrieved and 
     * stored as a non-reversible bcrypt hash. 
     * Note: at present, change of password may require manual restart of argocd server. 
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
    version: '3.33.5',
    chart: "argo-cd",
    release: "blueprints-addon-argocd",
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
        const manifest = new ArgoApplication(deployment.repository).generate(deployment, wave);
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
        const namespace = createNamespace(this.options.namespace!, clusterInfo.cluster, true);

        const sa = this.createServiceAccount(clusterInfo);
        sa.node.addDependency(namespace);

        const defaultValues: spi.Values = {};
        dot.set("server.serviceAccount.create", false, defaultValues);

        const secrets = [];

        if (this.options.bootstrapRepo?.credentialsSecretName) {
            const repo = this.options.bootstrapRepo;
            secrets.push(createSecretRef(repo.credentialsType!, repo.credentialsSecretName!));
        }
        if (this.options.adminPasswordSecretName) {
            const adminSecret = await this.createAdminSecret(clusterInfo.cluster.stack.region);
            dot.set("configs.secret.argocdServerAdminPassword", adminSecret, defaultValues, true);
        }

        let secretProviderClass: SecretProviderClass | undefined;

        if (secrets.length > 0) {
            secretProviderClass = new SecretProviderClass(clusterInfo, sa, 'blueprints-secret', ...secrets);
            dot.set('server', secretProviderClass.getVolumeMounts('blueprints-secret-inline'), defaultValues, true);
        }

        if (this.options.bootstrapRepo) {
            const repo = this.options.bootstrapRepo!;
            dot.set("configs.repositories.bootstrap", { url: repo.repoUrl }, defaultValues, true);
        }

        let values = merge(defaultValues, this.options.values ?? {});

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
    postDeploy(clusterInfo: spi.ClusterInfo, teams: spi.Team[]) {
        assert(teams != null);
        const appRepo = this.options.bootstrapRepo;

        if (appRepo) {
            // merge with custom bootstrapValues with AddOnContexts and common values
            const shared = { clusterName: clusterInfo.cluster.clusterName, region: Stack.of(clusterInfo.cluster).region };
            const merged = { ...shared, ...Object.fromEntries(clusterInfo.getAddOnContexts().entries()), ...this.options.bootstrapValues };

            this.generate(clusterInfo, {
                name: appRepo.name ?? "bootstrap-apps",
                namespace: this.options.namespace!,
                repository: appRepo,
                values: merged,
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
        return sa;
    }
}
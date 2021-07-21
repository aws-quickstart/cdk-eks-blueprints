import { HelmChart, KubernetesManifest } from "@aws-cdk/aws-eks";
import { Secret } from "@aws-cdk/aws-secretsmanager";

import { ClusterAddOn, ClusterInfo, ClusterPostDeploy } from "../../stacks/cluster-types";
import { Team } from "../../teams";

export interface ArgoApplicationRepository {
    /**
     * Expected to support helm style repo at the moment
     */
    repoUrl: string,

    /** 
     * Path within the repository 
     */
    path?: string,

    /**
     * Optional name for the bootstrap application
     */
    name?: string,

    /**
     * Secret from AWS Secrets Manager to import credentials to access the specified git repository.
     * The secret must exist in the same region and account where the stack will run. 
     */
    credentialsSecretName?: string,

    /**
     * Depending on credentials type the arn should either point to an SSH key
     * or a json file with username/password attributes.
     * For TOKEN type per ArgoCD documentation (https://argoproj.github.io/argo-cd/user-guide/private-repositories/) 
     * username can be any non-empty username and token value as password.
     */
    credentialsType?: "USERNAME" | "TOKEN" | "SSH"

}

/**
 * Configuration options for ArgoCD add-on.
 */
export interface ArgoCDAddOnProps {
    namespace?: string,
    /**
     * If provided, the addon will bootstrap the app or apps in the provided repository.
     * In general, the repo is expected to have the app of apps, which can enable to bootstrap all workloads,
     * after the infrastructure and team provisioning is complete. 
     */
    bootstrapRepo?: ArgoApplicationRepository
}

const argoDefaults: ArgoCDAddOnProps = {
    namespace: "argocd"
}
export class ArgoCDAddOn implements ClusterAddOn, ClusterPostDeploy {

    readonly options: ArgoCDAddOnProps;
    private chartNode: HelmChart;

    constructor(props?: ArgoCDAddOnProps) {
        this.options = { ...argoDefaults, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {
        this.chartNode = clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            release: "ssp-addon",
            repository: "https://argoproj.github.io/argo-helm",
            version: '3.2.3',
            namespace: this.options.namespace
        });
    }

    postDeploy(clusterInfo: ClusterInfo, teams: Team[]): void {
        console.assert(teams != null);
        const appRepo = this.options.bootstrapRepo;
        if(!appRepo) {
            return;
        }
        if(appRepo.credentialsSecretName) {
            this.createSecretKey(clusterInfo, appRepo.credentialsSecretName);
        }

        const manifest = new KubernetesManifest(clusterInfo.cluster.stack, "bootstrap-app", {
            cluster: clusterInfo.cluster,
            manifest : [{
                apiVersion: "argoproj.io/v1alpha1",
                kind: "Application",
                metadata: {
                    name: appRepo.name ?? "bootstrap-apps",
                    namespace: this.options.namespace
                },
                spec: {
                    destination:{
                        namespace: "default", 
                        server: "https://kubernetes.default.svc"
                    },
                    project: "default",
                    source: {
                        helm: {
                            valueFiles: ["values.yaml"]
                        },
                        path: appRepo.path,
                        repoURL: appRepo.repoUrl,
                        targetRevision: "HEAD"
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

    createSecretKey(clusterInfo : ClusterInfo, secretName : string) {
        const appRepo = this.options.bootstrapRepo!;
        const secret  = Secret.fromSecretNameV2(clusterInfo.cluster.stack, "argo-imported-secret", secretName);
        
        let credentials = {}

        switch(appRepo?.credentialsType) {
            case "SSH":
                credentials = { sshPrivateKey: secret.secretValue.toString() };
                break;
            case "USERNAME":
            case "TOKEN": 
                credentials = secret.secretValue.toJSON();
                break;
        }

        const manifest = new KubernetesManifest(clusterInfo.cluster.stack, "argo-bootstrap-secret", {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: "v1",
                kind: "Secret", 
                metadata: {
                  name: appRepo?.name?? "bootstrap-repo-secret",
                  namespace: this.options.namespace,
                  labels: {
                    "argocd.argoproj.io/secret-type": "repository"
                  }
                },
                stringData: {
                  url: appRepo.repoUrl,
                  credentials
                }
            }],
            overwrite: true,
            prune: true
        });
        manifest.node.addDependency(this.chartNode);
    }
}
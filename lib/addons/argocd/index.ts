import { HelmChart, KubernetesManifest, ServiceAccount } from "@aws-cdk/aws-eks";
import { ManagedPolicy } from "@aws-cdk/aws-iam";
import { SecretsManager } from "aws-sdk";

import { ClusterAddOn, ClusterInfo, ClusterPostDeploy } from "../../stacks/cluster-types";
import { Team } from "../../teams";
import * as yaml from 'yaml';
import { btoa } from '../../utils/string-utils';


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
     * Depending on credentials type the arn should either point to an SSH key (plain text value)
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

    /**
     * Namespace where add-on will be deployed. 
     */
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

/**
 * Local function to create a secret reference for SSH key.
 * @param url 
 * @param secretName 
 * @returns 
 */
const sshRepoRef = (url: string, secretName : string) : string => yaml.stringify(
    [{
        url,
        sshPrivateKeySecret: {
            name: secretName,
            key: "sshPrivateKey"
        }  
    }]
);


/**
 * Local function to a secret reference for username/pwd or username/token key.
 * @param url 
 * @param secretName 
 * @returns 
 */
const userNameRepoRef = (url: string, secretName: string) : string => yaml.stringify(
        [{
            url,
            usernameSecret: {
                name: secretName,
                key: "username"
            },
            passwordSecret: {
                name: secretName,
                key: "password"
            }  
        }]
);


/**
 * Implementation of ArgoCD add-on and post deployment hook.
 */
export class ArgoCDAddOn implements ClusterAddOn, ClusterPostDeploy {

    readonly options: ArgoCDAddOnProps;
    private chartNode: HelmChart;

    constructor(props?: ArgoCDAddOnProps) {
        this.options = { ...argoDefaults, ...props };
    }

    /**
     * Impementation of the add-on contract deploy method.
    */
    async deploy(clusterInfo: ClusterInfo) : Promise<any> {

        let repo = "";
        const sa  = this.createServiceAccount(clusterInfo);

        if(this.options.bootstrapRepo?.credentialsSecretName) {
            repo = await this.createSecretKey(clusterInfo, this.options.bootstrapRepo.credentialsSecretName);
            console.log(repo);
        }

        this.chartNode = clusterInfo.cluster.addHelmChart("argocd-addon", {
            chart: "argo-cd",
            release: "ssp-addon",
            repository: "https://argoproj.github.io/argo-helm",
            version: '3.10.0',
            namespace: this.options.namespace,
            values: {
                server: {
                    serviceAccount: {
                        create: false
                    },
                    config: {
                        repositories: repo
                    }
                }
            }
        });
        console.log(this.chartNode.node);
        //this.chartNode.node.addDependency(sa);
    }

    /**
     * Post deployment step is used to create a bootstrap repository if options are provided for the add-on.
     * @param clusterInfo 
     * @param teams 
     * @returns 
     */
    async postDeploy(clusterInfo: ClusterInfo, teams: Team[]) {
        console.assert(teams != null);
        console.log('in post deploy')
        const appRepo = this.options.bootstrapRepo;
        
        if(!appRepo) {
            return;
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
        console.log("after post deploy", this.chartNode);
    }

    /**
     * Creates a secret key 
     * @param clusterInfo 
     * @param secretName 
     * @returns reference to the secret to add to the ArgoCD config map
     */
    protected async createSecretKey(clusterInfo : ClusterInfo, secretName : string) : Promise<string> {

        const appRepo = this.options.bootstrapRepo!;
        let credentials = { url: appRepo.repoUrl };

        const secretValue = await this.getSecretValue(secretName, clusterInfo.cluster.stack.region);
        
        let result = "";

        switch(appRepo?.credentialsType) {
            case "SSH":
                credentials = {...credentials, ...{ sshPrivateKey: btoa(secretValue) }};
                result = sshRepoRef(appRepo.repoUrl, secretName);
                break;
            case "USERNAME":
            case "TOKEN": 
                // eslint-disable-next-line no-case-declarations
                const secretJson : any = JSON.parse(secretValue);
                credentials = {...credentials, ...{
                    username: btoa(secretJson["username"]),
                    password: btoa(secretJson["password"])
                }};
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

        manifest.node.addDependency(this.chartNode);
        return result;
    }

    /**
     * Gets secret value from AWS Secret Manager. Requires access rights to the secret, specified by the secretName parameter.
     * @param secretName name of the secret to retrieve
     * @param region 
     * @returns 
     */
    protected async getSecretValue(secretName: string, region: string): Promise<string> {
        const secretManager = new SecretsManager({ region: region });
        let secretString = "";
        try {
            let response = await secretManager.getSecretValue({ SecretId: secretName }).promise();
            if (response) {
                if (response.SecretString) {
                    secretString = response.SecretString;
                } else if (response.SecretBinary) {
                    throw new Error(`Invalid secret format for ${secretName}. Expected string value, received binary.`);
                }
            }
            return secretString;
        } 
        catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Creates a service account that can access secrets
     * @param clusterInfo 
     * @returns 
     */
    protected createServiceAccount(clusterInfo: ClusterInfo) : ServiceAccount {
        const sa = clusterInfo.cluster.addServiceAccount('argo-cd-server', { 
            name: "argocd-server", 
            namespace: this.options.namespace
        });

        const secretPolicy = ManagedPolicy.fromAwsManagedPolicyName("SecretsManagerReadWrite");
        sa.role.addManagedPolicy(secretPolicy);
        return sa;
    }
}
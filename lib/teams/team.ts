import { KubernetesManifest, ServiceAccount} from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import { CfnOutput } from 'aws-cdk-lib';
import { CsiSecretProps, SecretProviderClass } from '../addons/secrets-store/csi-driver-provider-aws-secrets';
import { ClusterInfo, Team, Values } from '../spi';
import { applyYamlFromDir} from '../utils/yaml-utils';
import { DefaultTeamRoles } from './default-team-roles';
import { IRole } from "aws-cdk-lib/aws-iam";

/**
 * Team properties.
 */
export class TeamProps {

    /**
     * Required unique name for organization.
     * May map to an OU name. 
     */
    readonly name: string;

    /**
     * Defaults to team name prefixed by "team-"
     */
    readonly namespace?: string;

    /**
     *  Annotations such as necessary for GitOps engine. 
     */
    readonly namespaceAnnotations? : { [key: string]: any; } = { "argocd.argoproj.io/sync-wave": "-1" };

    /**
     * Labels such as necessary for AWS AppMesh 
     */
    readonly namespaceLabels? : { [key: string]: any; };

    /**
     * Optional, but highly recommended setting to ensure predictable demands.
     */
    readonly namespaceHardLimits?: Values = {
        'requests.cpu': '10', // TODO verify sane defaults
        'requests.memory': '10Gi',
        'limits.cpu': '20',
        'limits.memory': '20Gi'
    };

    /**
     * Service Account Name
     */
    readonly serviceAccountName?: string;

    /**
     *  Team members who need to get access to the cluster
     */
    readonly users?: Array<iam.ArnPrincipal>;

    /**
     * Options existing role that should be used for cluster access. 
     * If userRole and users are not provided, then no IAM setup is performed. 
     */
    readonly userRoleArn?: string;

    /**
     * Team Secrets
     */
    readonly teamSecrets?: CsiSecretProps[];

    /**
     * Optional, directory where a team's manifests are stored
     */
     readonly teamManifestDir?: string;
}

export class ApplicationTeam implements Team {

    readonly teamProps: TeamProps;

    readonly name: string;

    public namespaceManifest: KubernetesManifest;

    public serviceAccount: ServiceAccount;

    constructor(teamProps: TeamProps) {
        this.name = teamProps.name;
        this.teamProps = {
            name: teamProps.name,
            namespace: teamProps.namespace ?? "team-" + teamProps.name,
            users: teamProps.users,
            namespaceAnnotations: teamProps.namespaceAnnotations,
            namespaceLabels: teamProps.namespaceLabels,
            namespaceHardLimits: teamProps.namespaceHardLimits,
            serviceAccountName: teamProps.serviceAccountName,
            userRoleArn: teamProps.userRoleArn,
            teamSecrets: teamProps.teamSecrets,
            teamManifestDir: teamProps.teamManifestDir
        };
    }

    public setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAccess(clusterInfo);
        this.setupNamespace(clusterInfo);
        this.setupServiceAccount(clusterInfo);
        this.setupSecrets(clusterInfo);
    }

    protected defaultSetupAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;

        const users = this.teamProps.users ?? [];
        const teamRole = this.getOrCreateRole(clusterInfo, users, props.userRoleArn);

        if (teamRole) {
            awsAuth.addRoleMapping(teamRole, { groups: [props.namespace! + "-team-group"], username: props.name });
            new CfnOutput(clusterInfo.cluster.stack, props.name + ' team role ', { value: teamRole ? teamRole.roleArn : "none" });
        }
    }

    /**
     * 
     * @param clusterInfo 
     */
    protected defaultSetupAdminAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;
        const admins = this.teamProps.users ?? [];
        const adminRole = this.getOrCreateRole(clusterInfo, admins, props.userRoleArn);

        new CfnOutput(clusterInfo.cluster.stack, props.name + ' team admin ', { value: adminRole ? adminRole.roleArn : "none" });

        if (adminRole) {
            awsAuth.addMastersRole(adminRole, this.teamProps.name);
        }
    }

    /**
     * Creates a new role with trust relationship or adds trust relationship for an existing role.
     * @param clusterInfo 
     * @param users 
     * @param role may be null if both role and users were not provided
     * @returns 
     */
    protected getOrCreateRole(clusterInfo: ClusterInfo, users: Array<iam.ArnPrincipal>, roleArn?: string): iam.IRole | undefined {
        let role: IRole | undefined = undefined;
        
        if (roleArn) {
            role = iam.Role.fromRoleArn(clusterInfo.cluster.stack, `${this.name}-team-role`, roleArn);
            users.forEach(user => role?.grant(user, "sts:assumeRole"));
        }
        else if(users && users.length > 0){
            role = new iam.Role(clusterInfo.cluster.stack, this.teamProps.namespace + 'AccessRole', {
                assumedBy: new iam.CompositePrincipal(...users)
            });
            role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: [clusterInfo.cluster.clusterArn],
                actions: [
                    "eks:DescribeNodegroup",
                    "eks:ListNodegroups",
                    "eks:DescribeCluster",
                    "eks:ListClusters",
                    "eks:AccessKubernetesApi",
                    "ssm:GetParameter",
                    "eks:ListUpdates",
                    "eks:ListFargateProfiles"
                ]
                })
            );
            role.addToPrincipalPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: ["*"],
                actions: [
                    "eks:ListClusters"
                    ]
                })
            );
        }

        return role;
    }

    /**
     * Creates namespace and sets up policies.
     * @param clusterInfo 
     */
    protected setupNamespace(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const namespaceName = props.namespace!;
        const teamManifestDir = props.teamManifestDir;

        this.namespaceManifest = new KubernetesManifest(clusterInfo.cluster.stack, props.name, {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: namespaceName,
                    annotations: props.namespaceAnnotations,
                    labels: props.namespaceLabels
                }
            }],
            overwrite: true,
            prune: true
        });

        if (props.namespaceHardLimits) {
            this.setupNamespacePolicies(clusterInfo, namespaceName);
        }

        const defaultRoles = new DefaultTeamRoles().createManifest(namespaceName); //TODO: add support for custom RBAC

        const rbacManifest = new KubernetesManifest(clusterInfo.cluster.stack, namespaceName + "-rbac", {
            cluster: clusterInfo.cluster,
            manifest: defaultRoles,
            overwrite: true,
            prune: true
        });

        rbacManifest.node.addDependency(this.namespaceManifest);

        if (teamManifestDir){
            applyYamlFromDir(teamManifestDir, clusterInfo.cluster, this.namespaceManifest);
        }
    }

    /**
     * Sets up quotas
     * @param clusterInfo 
     * @param namespaceName 
     */
    protected setupNamespacePolicies(clusterInfo: ClusterInfo, namespaceName: string) {
        const quotaName = this.teamProps.name + "-quota";
        const quotaManifest = clusterInfo.cluster.addManifest(quotaName, {
            apiVersion: 'v1',
            kind: 'ResourceQuota',
            metadata: {
                name: quotaName,
                namespace: namespaceName
            },
            spec: {
                hard: this.teamProps.namespaceHardLimits
            }
        });
        quotaManifest.node.addDependency(this.namespaceManifest);
    }
    
    /**
     * Sets up ServiceAccount for the team namespace
     * @param clusterInfo 
     */
    protected setupServiceAccount(clusterInfo: ClusterInfo) {
        const serviceAccountName = this.teamProps.serviceAccountName? this.teamProps.serviceAccountName : `${this.teamProps.name}-sa`;
        const cluster = clusterInfo.cluster;
        
        this.serviceAccount = cluster.addServiceAccount(`${this.teamProps.name}-service-account`, {
            name: serviceAccountName,
            namespace: this.teamProps.namespace
        });
        this.serviceAccount.node.addDependency(this.namespaceManifest);

        const serviceAccountOutput = new CfnOutput(clusterInfo.cluster.stack, `${this.teamProps.name}-sa`, {
            value: serviceAccountName
        });
        serviceAccountOutput.node.addDependency(this.namespaceManifest);
    }

    /**
     * Sets up secrets
     * @param clusterInfo
     */
    protected setupSecrets(clusterInfo: ClusterInfo) {
        if (this.teamProps.teamSecrets) {
            const secretProviderClassName = this.teamProps.name + '-aws-secrets';
            new SecretProviderClass(clusterInfo, this.serviceAccount, secretProviderClassName, ...this.teamProps.teamSecrets);
        }
    }
}

/**
 * Platform team will setup all team members as admin access to the cluster by adding them to the master group.
 * The setup skips namespace/quota configuration.
 */
export class PlatformTeam extends ApplicationTeam {

    constructor(teamProps: TeamProps) {
        super(teamProps);
    }

    /**
     * Override
     * @param clusterInfo
     */
    setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAdminAccess(clusterInfo);
    }
}
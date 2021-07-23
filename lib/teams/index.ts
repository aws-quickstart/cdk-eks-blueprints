import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import { ClusterInfo } from "../stacks/cluster-types";
import { CfnOutput } from "@aws-cdk/core";
import { DefaultTeamRoles } from "./default-team-roles";
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { Secret, SecretType } from "../addons/secrets-store";

/**
 * Interface for a team. 
 */
export interface Team {

    name: string;

    setup(clusterInfo: ClusterInfo): void;
}

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
     * Optional, but highly recommended setting to ensure predictable demands.
     */
    readonly namespaceHardLimits?= {
        'requests.cpu': '10', // TODO verify sane defaults
        'requests.memory': '10Gi',
        'limits.cpu': '20',
        'limits.memory': '20Gi'
    }

    /**
     *  Team members who need to get access to the cluster
     */
    readonly users?: Array<iam.ArnPrincipal>;

    /**
     * Options existing role that should be used for cluster access. 
     * If userRole and users are not provided, then no IAM setup is performed. 
     */
    readonly userRole?: iam.IRole;

    /**
     * List of Secrets to setup and retrive
     */
    readonly secrets?: Secret[];
}

export class ApplicationTeam implements Team {

    readonly teamProps: TeamProps;

    readonly name: string;

    constructor(teamProps: TeamProps) {
        this.name = teamProps.name;
        this.teamProps = {
            name: teamProps.name,
            namespace: teamProps.namespace ?? "team-" + teamProps.name,
            users: teamProps.users,
            namespaceAnnotations: teamProps.namespaceAnnotations,
            namespaceHardLimits: teamProps.namespaceHardLimits,
            userRole: teamProps.userRole,
            secrets: teamProps.secrets
        }
    }

    public setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAccess(clusterInfo);
        this.setupNamespace(clusterInfo);
        this.setupSecrets(clusterInfo);
    }

    protected defaultSetupAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;

        const users = this.teamProps.users ?? [];
        const teamRole = this.getOrCreateRole(clusterInfo, users, props.userRole);

        if (teamRole) {
            awsAuth.addRoleMapping(teamRole, { groups: [props.namespace! + "-team-group"], username: props.name });
            new CfnOutput(clusterInfo.cluster.stack, props.name + ' team role ', { value: teamRole ? teamRole.roleArn : "none" })
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
        const adminRole = this.getOrCreateRole(clusterInfo, admins, props.userRole);

        new CfnOutput(clusterInfo.cluster.stack, props.name + ' team admin ', { value: adminRole ? adminRole.roleArn : "none" })

        if (adminRole) {
            awsAuth.addMastersRole(adminRole);
        }
    }

    /**
     * Creates a new role with trust relationship or adds trust relationship for an existing role.
     * @param clusterInfo 
     * @param users 
     * @param role may be null if both role and users were not provided
     * @returns 
     */
    protected getOrCreateRole(clusterInfo: ClusterInfo, users: Array<iam.ArnPrincipal>, role?: iam.IRole): iam.IRole | undefined {
        if (users?.length == 0) {
            return role;
        }

        if (role) {
            users.forEach(user => role?.grant(user, "sts:assumeRole"));
        }
        else {
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

        const namespaceManifest = new KubernetesManifest(clusterInfo.cluster.stack, props.name, {
            cluster: clusterInfo.cluster,
            manifest: [{
                apiVersion: 'v1',
                kind: 'Namespace',
                metadata: {
                    name: namespaceName,
                    annotations: props.namespaceAnnotations
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

        rbacManifest.node.addDependency(namespaceManifest);
    }

    /**
     * Sets up quotas
     * @param clusterInfo 
     * @param namespaceName 
     */
    protected setupNamespacePolicies(clusterInfo: ClusterInfo, namespaceName: string) {
        const quotaName = this.teamProps.name + "-quota";
        clusterInfo.cluster.addManifest(quotaName, {
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
    }

    /**
     * Sets up secrets
     * @param clusterInfo
     */
    protected setupSecrets(clusterInfo: ClusterInfo) {
        const secrets = this.teamProps.secrets;
        if (Array.isArray(secrets) && secrets.length) {
            const cluster = clusterInfo.cluster;
            const secretProviderClass = this.teamProps.name + '-aws-secrets';
            type secretObject = {
                objectName: string;
                objectType: SecretType;
                region?: string;
            }
            let objects: secretObject[] = [];

            const serviceAccount = cluster.addServiceAccount(this.teamProps.name + '-sa', {
                name: this.teamProps.name + '-sa',
                namespace: this.teamProps.namespace
            });

            secrets.forEach( (secret) => {
                const objectName = secret.secretName;
                const objectType = secret.secretType;
                const region = secret.secretRegion ? secret.secretRegion : cdk.Aws.REGION;
                const accountId = secret.secretAccountId ? secret.secretAccountId : cdk.Aws.ACCOUNT_ID;

                objects.push({
                    objectName,
                    objectType,
                    region,
                });

                let policyStatement: iam.PolicyStatement;

                if (secret.secretType === SecretType.SECRETSMANAGER) {
                    policyStatement = new iam.PolicyStatement({
                        actions: [
                            'secretsmanager:GetSecretValue',
                            'secretsmanager:DescribeSecret'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:secretsmanager:${region}:${accountId}:secret:${secret.secretName}-??????`]
                    });
                }
                else {
                    policyStatement = new iam.PolicyStatement({
                        actions: [
                            'ssm:GetParameters'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:ssm:${region}:${accountId}:parameter/${secret.secretName}`]
                    });
                }

                serviceAccount.addToPrincipalPolicy(policyStatement);
            });

            cluster.addManifest(secretProviderClass, {
                apiVersion: 'secrets-store.csi.x-k8s.io/v1alpha1',
                kind: 'SecretProviderClass',
                metadata: {
                    name: secretProviderClass
                },
                spec: {
                    provider: 'aws',
                    parameters: {
                        objects: objects.toString(),
                    }
                }
            });
        }
    }
}

/**
 * Platform team will setup all team members as admin access to the cluster by adding them to the master group.
 * The setup skips namespace/quota configuration.
 */
export class PlatformTeam extends ApplicationTeam {

    /**
     * Override
     * @param clusterInfo
     */
    setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAdminAccess(clusterInfo);
    }
}

import { PolicyStatement } from "@aws-cdk/aws-iam";
import * as iam from '@aws-cdk/aws-iam';
import { ClusterInfo, TeamSetup } from "../stacks/eks-blueprint-stack";
import { CfnOutput } from "@aws-cdk/core";

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
    readonly namespaceAnnotations?= { "argocd.argoproj.io/sync-wave": "-1" };

    /**
     * Optional, but highly recommended setting to ensure predictable demands.
     */
    readonly namespaceHardLimits? = {
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
    readonly userRole?: iam.Role;
}

export class Team implements TeamSetup {

    readonly teamProps: TeamProps;

    constructor(teamProps: TeamProps) {
        this.teamProps = teamProps ?? new TeamProps;
    }

    setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAccess(clusterInfo);
        this.setupNamespace(clusterInfo);
    }

    defaultSetupAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;

        const users = this.teamProps.users ?? [];
        const teamRole = this.getOrCreateRole(clusterInfo, users, props.userRole);

        if (teamRole) {
            awsAuth.addRoleMapping(teamRole, { groups: [props.name + "-group"], username: props.name });
            new CfnOutput(clusterInfo.cluster.stack, props.name + ' team role ', { value: teamRole ? teamRole.roleArn : "none" })
        }
    }

    defaultSetupAdminAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;
        const admins = this.teamProps.users ?? [];
        const adminRole = this.getOrCreateRole(clusterInfo, admins, props.userRole);

        new CfnOutput(clusterInfo.cluster.stack, props.name + ' team admin ', { value: adminRole ? adminRole.roleArn : "none" })

        if (adminRole) {
            awsAuth.addMastersRole(adminRole);
        }
    }


    getOrCreateRole(clusterInfo: ClusterInfo, users: Array<iam.ArnPrincipal>, role?: iam.Role): iam.Role | undefined {
        if (users?.length == 0) {
            return role;
        };

        if (role) {
            role.assumeRolePolicy?.addStatements(
                new PolicyStatement({
                    principals: users
                })
            );
        }
        else {
            role = new iam.Role(clusterInfo.cluster.stack, clusterInfo.cluster.clusterName + 'AccessRole', {
                assumedBy: new iam.CompositePrincipal(...users)
            });
            role.addToPolicy(new iam.PolicyStatement({
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
        }

        return role;
    }

    setupNamespace(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const namespaceName = props.namespace ?? "team-" + props.name;
        const namespace = clusterInfo.cluster.addManifest(props.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: namespaceName,
                annotations: props.namespaceAnnotations
            }
        });

        if(props.namespaceHardLimits) {
            this.setupNamespacePolicies(clusterInfo, namespaceName);
        }
    }

    setupNamespacePolicies(clusterInfo: ClusterInfo, namespaceName: string) {
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
}

/**
 * Platform team will setup all team members as admin access to the cluster by adding them to the master group.
 */
export class PlatformTeam extends Team {

    setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAdminAccess(clusterInfo);
    }

}
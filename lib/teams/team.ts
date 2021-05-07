import { UntrustedCodeBoundaryPolicy } from "@aws-cdk/aws-codebuild";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import * as iam from '@aws-cdk/aws-iam';
import { ClusterInfo, TeamSetup } from "../stacks/eks-blueprint-stack";
import { CfnOutput } from "@aws-cdk/core";

export class TeamProps {

    readonly name: string;

    readonly adminUser?: iam.User;
    readonly adminUserRole?: iam.Role;

    readonly users?: Array<iam.User>;
    readonly userRole?: iam.Role;
}

export class Team implements TeamSetup {

    readonly teamProps: TeamProps;

    constructor(teamProps: TeamProps) {
        this.teamProps = teamProps ?? new TeamProps;
    }

    setup(clusterInfo: ClusterInfo): void {
        this.defaultSetupAccess(clusterInfo);
    }

    defaultSetupAccess(clusterInfo: ClusterInfo) {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;
        const admins = this.teamProps.adminUser ? [this.teamProps.adminUser] : [];
        const adminRole = this.getOrCreateRole(clusterInfo, admins, props.adminUserRole);

        new CfnOutput(clusterInfo.cluster.stack, props.name + ' team admin ', { value: adminRole.roleArn })

        if (adminRole) {
            awsAuth.addMastersRole(adminRole);
        }

        const users = this.teamProps.users ?? [];
        const teamRole = this.getOrCreateRole(clusterInfo, users, props.userRole);

        if (teamRole) {
            awsAuth.addRoleMapping(teamRole, { groups: [props.name + "-group"], username: props.name });
        }
    }

    private getOrCreateRole(clusterInfo: ClusterInfo, users: Array<User>, role?: Role): Role | undefined {
        if (users?.length == 0) {
            return role;
        }

        let principals = users?.map(item => new iam.ArnPrincipal(item.userArn));

        if (role) {
            role.assumeRolePolicy?.addStatements(
                new PolicyStatement({
                    principals: principals
                })
            );
        }
        else {
            role = new iam.Role(clusterInfo.cluster.stack, clusterInfo.cluster.clusterName + "Admin", {
                assumedBy: new iam.CompositePrincipal(...principals)
            });
            role.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.,
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
}
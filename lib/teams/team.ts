import { UntrustedCodeBoundaryPolicy } from "@aws-cdk/aws-codebuild";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Role, User } from "@aws-cdk/aws-iam";
import { AnyPrincipal, ArnPrincipal, CompositePrincipal } from "@aws-cdk/aws-iam/lib/principals";
import { unwatchFile } from "fs";
import { ClusterInfo, TeamSetup } from "../eksBlueprintStack";

export class TeamProps {

    readonly name: string;

    readonly adminUser?: User;
    readonly adminUserRole?: Role;
 
    readonly users?: Array<User>;
    readonly userRole? : Role;
}

export class Team implements TeamSetup {

    readonly teamProps: TeamProps;

    constructor(teamProps: TeamProps) {
        this.teamProps = teamProps ?? new TeamProps;
    }

    setup(clusterInfo: ClusterInfo): void {
        const props = this.teamProps;
        const awsAuth = clusterInfo.cluster.awsAuth;
        const admins = this.teamProps.adminUser ? [this.teamProps.adminUser] : [];
        const adminRole = this.getOrCreateRole(clusterInfo, admins, props.adminUserRole);

        if(adminRole) {
            awsAuth.addMastersRole(adminRole);
        }
        
        const users = this.teamProps.users ?? [];
        const teamRole = this.getOrCreateRole(clusterInfo, users, props.userRole);

        if(teamRole) {
            awsAuth.addRoleMapping(teamRole, {groups: [props.name + "-group"], username: props.name});
        }
    }

    private getOrCreateRole(clusterInfo: ClusterInfo,  users: Array<User>, role? : Role) : Role | undefined {   
        if(users?.length == 0) {
            return role;
        }
        
        let principals = users?.map(item => new ArnPrincipal(item.userArn));

        if(role) {
            role.assumeRolePolicy?.addStatements(
                new PolicyStatement({
                    principals: principals
                })
            );
        }
        else {
            role = new Role(clusterInfo.cluster, clusterInfo.cluster.clusterName + "Admin", {
                assumedBy: new CompositePrincipal(...principals)
            });
        }

        return role;
    }
}
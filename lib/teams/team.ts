import { Role, User } from "@aws-cdk/aws-iam";
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

        if(this.teamProps.adminUserRole)
            clusterInfo.cluster.awsAuth.addMastersRole(this.teamProps.adminUserRole);

    }



}
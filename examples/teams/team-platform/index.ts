import { PlatformTeam } from '../../../lib/teams';


export class TeamPlatform extends PlatformTeam {
    constructor(accountID: string) {
        super({
            name: "platform",
            userRoleArn: `arn:aws:iam::${accountID}:role/Admin`,
            // users: [new ArnPrincipal(`arn:aws:iam::${accountID}:user/superadmin`)]
        });
    }
}
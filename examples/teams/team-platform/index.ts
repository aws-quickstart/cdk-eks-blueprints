import { ArnPrincipal } from "@aws-cdk/aws-iam";

import { PlatformTeam } from '../../../lib/teams';

export class TeamPlatform extends PlatformTeam {
    constructor(accountID: string) {
        super({
            name: "platform",
            users: [new ArnPrincipal(`arn:aws:iam::${accountID}:user/superadmin`)]
        });
    }
}
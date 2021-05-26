import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { App } from '@aws-cdk/core';

import { ApplicationTeam } from '../../../lib/teams';

function getUserArns(app: App, key: string): ArnPrincipal[] {
    const context: string = app.node.tryGetContext(key);
    if (context) {
        return context.split(",").map(e => new ArnPrincipal(e));
    }
    return [];
}

export class TeamBurnhamSetup extends ApplicationTeam {
    constructor(app: App) {
        super({
            name: "burnham",
            users: getUserArns(app, "team-burnham.users")
        });
    }
}
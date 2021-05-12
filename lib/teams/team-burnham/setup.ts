import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Team } from '../team';

export class TeamBurnhamSetup extends Team {
    constructor() {
        super({
            name: "burnham",
            users: [
                new ArnPrincipal("arn:aws:iam::929819487611:user/shapirov-dev"),  
                new ArnPrincipal("arn:aws:iam::929819487611:user/djl-demo")
            ]
        });
    }
}
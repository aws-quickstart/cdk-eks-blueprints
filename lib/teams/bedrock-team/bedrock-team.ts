import { ClusterInfo } from "../../spi";
import { ApplicationTeam, TeamProps } from "../team";
import { getBedrockPolicyDocument } from "./iam-policy";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Interface to define a GenAI on EKS team
 */
export interface BedrockTeamProps extends TeamProps {
    /**
     * Name of the service account namespace.
     */
    namespace?: string;

    /**
     * Create Namespace with the provided one.
     */
    createNamespace?: boolean

    /**
     * Name of the service account for Bedrock.
     */
    serviceAccountName?: string;
}

/*
 *This class define the Team that can be used with `GenAIBuilder`
 *Sets IRSA for access to bedrock with required IAM policy along with creating a namespace.
*/

export class BedrockTeam extends ApplicationTeam {

  private bedrockTeam: BedrockTeamProps;
  /**
   * @public
   * @param {BedrockTeamProps} props the Bedrock team definition {@link BedrockTeamProps}
   */
  constructor(props: BedrockTeamProps) {
    super(props);
    this.bedrockTeam = props;
  }

  protected setupServiceAccount(clusterInfo: ClusterInfo) {

    super.setupServiceAccount(clusterInfo);
    // Apply IAM policy for Bedrock to the service account.
    getBedrockPolicyDocument().forEach((statement) => {
      this.serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
    });
  }
}

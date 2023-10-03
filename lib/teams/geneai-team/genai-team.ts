import { ClusterInfo } from "../../spi";
import { ApplicationTeam, TeamProps } from "../team";
import { createNamespace } from "../../utils/namespace-utils";
import { getBedrockPolicyDocument } from "./iam-policy";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Interface to define a GenAI on EKS team
 */
export interface GenAITeamProps extends TeamProps {
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

export class GenAITeam extends ApplicationTeam {

  private genAITeam: GenAITeamProps;
  /**
   * @public
   * @param {GenAITeamProps} props the Gen AI team definition {@link GenAITeamProps}
   */
  constructor(props: GenAITeamProps) {
    super(props);
    this.genAITeam = props;
  }

  setup(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;
    const namespace = this.genAITeam.namespace!;

    // Create the Bedrock service account.
    const serviceAccountName = this.genAITeam.serviceAccountName!;
    const sa = cluster.addServiceAccount(serviceAccountName, {
        name: serviceAccountName,
        namespace: namespace
    });

    // Create namespace
    if (this.genAITeam.createNamespace) {
        const ns = createNamespace(namespace, cluster, true);
        sa.node.addDependency(ns);
    }

    // Apply additional IAM policies to the service account.
    getBedrockPolicyDocument().forEach((statement) => {
        sa.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
    });
  }
}

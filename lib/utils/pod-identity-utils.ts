import { CfnPodIdentityAssociation, ICluster } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Creates IAM role and EKS Pod Identity association
 * @param clusterInfo
 * @param name
 * @param namespace
 * @param policyDocument
 *
 * @returns podIdentityAssociation
 */
export function podIdentityAssociation(
  cluster: ICluster,
  name: string,
  namespace: string,
  policyDocument: iam.PolicyDocument
): CfnPodIdentityAssociation {
  const policy = new iam.ManagedPolicy(cluster, `${name}-managed-policy`, {
    document: policyDocument,
  });

  const role = new iam.Role(cluster, `${name}-role`, {
    assumedBy: new iam.ServicePrincipal("pods.eks.amazonaws.com"),
  });
  role.assumeRolePolicy?.addStatements(
    new iam.PolicyStatement({
      sid: "AllowEksAuthToAssumeRoleForPodIdentity",
      actions: [
        "sts:AssumeRole",
        "sts:TagSession"
      ],
      principals: [new iam.ServicePrincipal("pods.eks.amazonaws.com")],
    })
  );
  role.addManagedPolicy(policy);

  const podIdentityAssociation = new CfnPodIdentityAssociation(cluster, `${name}-pod-identity-association`, {
    clusterName: cluster.clusterName,
    namespace,
    roleArn: role.roleArn,
    serviceAccount: name,
  });
  return podIdentityAssociation;
}
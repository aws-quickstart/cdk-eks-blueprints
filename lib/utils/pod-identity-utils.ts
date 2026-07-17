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
  return podIdentityAssociationWithPolicies(cluster, name, namespace, policy);
}

/**
 * Same as {@link podIdentityAssociation}, but attaches one or more pre-built managed policies to the
 * pod identity role. Useful when a permission set must be split across multiple managed policies to
 * stay under the IAM managed-policy size quota (e.g. the Karpenter controller).
 *
 * @param cluster
 * @param name
 * @param namespace
 * @param policies one or more managed policies to attach to the pod identity role
 *
 * @returns podIdentityAssociation
 */
export function podIdentityAssociationWithPolicies(
  cluster: ICluster,
  name: string,
  namespace: string,
  ...policies: iam.IManagedPolicy[]
): CfnPodIdentityAssociation {
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
  policies.forEach((policy) => role.addManagedPolicy(policy));

  const podIdentityAssociation = new CfnPodIdentityAssociation(cluster, `${name}-pod-identity-association`, {
    clusterName: cluster.clusterName,
    namespace,
    roleArn: role.roleArn,
    serviceAccount: name,
  });
  return podIdentityAssociation;
}
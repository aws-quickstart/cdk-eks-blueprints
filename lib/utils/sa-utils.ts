import { Cluster, ServiceAccount } from "aws-cdk-lib/aws-eks";
import { CfnJson, Names } from "aws-cdk-lib";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from 'constructs';

/**
 * Creates a service account that can access secrets
 * @param clusterInfo 
 * @returns sa
 */
export function createServiceAccount(cluster: Cluster, name: string, namespace: string, policyDocument: iam.PolicyDocument): ServiceAccount {
    const policy = new iam.ManagedPolicy(cluster, `${name}-managed-policy`, {
        document: policyDocument
    });

    return createServiceAccountWithPolicy(cluster, name, namespace, policy);

}

export function createServiceAccountWithPolicy(cluster: Cluster, name: string, namespace: string, ...policies: iam.IManagedPolicy[]): ServiceAccount {
    const sa = cluster.addServiceAccount(`${name}-sa`, {
        name: name,
        namespace: namespace
    });

    policies.forEach(policy => sa.role.addManagedPolicy(policy));
    return sa;
}

/**
 * This class is a copy of the CDK ServiceAccount class with the only difference of allowing 
 * to replace service account if it already exists (e.g. a case with installing VPC CNI add-on).
 * Once CDK adds support to replace an existing service account, this class should be deleted and replaced
 * with the standard eks.ServiceAccount.
 */
export class ReplaceServiceAccount extends Construct implements iam.IPrincipal {
    /**
     * The role which is linked to the service account.
     */
    public readonly role: iam.IRole;
  
    public readonly assumeRoleAction: string;
    public readonly grantPrincipal: iam.IPrincipal;
    public readonly policyFragment: iam.PrincipalPolicyFragment;
  
    /**
     * The name of the service account.
     */
    public readonly serviceAccountName: string;
  
    /**
     * The namespace where the service account is located in.
     */
    public readonly serviceAccountNamespace: string;
  
    constructor(scope: Construct, id: string, props: eks.ServiceAccountProps) {
      super(scope, id);
  
      const { cluster } = props;
      this.serviceAccountName = props.name ?? Names.uniqueId(this).toLowerCase();
      this.serviceAccountNamespace = props.namespace ?? 'default';
  
      // From K8s docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
      if (!this.isValidDnsSubdomainName(this.serviceAccountName)) {
        throw RangeError('The name of a ServiceAccount object must be a valid DNS subdomain name.');
      }
  
      // From K8s docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#namespaces-and-dns
      if (!this.isValidDnsLabelName(this.serviceAccountNamespace)) {
        throw RangeError('All namespace names must be valid RFC 1123 DNS labels.');
      }
  
      /* Add conditions to the role to improve security. This prevents other pods in the same namespace to assume the role.
      * See documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-service-account-iam-policy-and-role.html
      */
      const conditions = new CfnJson(this, 'ConditionJson', {
        value: {
          [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]: 'sts.amazonaws.com',
          [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: `system:serviceaccount:${this.serviceAccountNamespace}:${this.serviceAccountName}`,
        },
      });
      const principal = new iam.OpenIdConnectPrincipal(cluster.openIdConnectProvider).withConditions({
        StringEquals: conditions,
      });
      this.role = new iam.Role(this, 'Role', { assumedBy: principal });
  
      this.assumeRoleAction = this.role.assumeRoleAction;
      this.grantPrincipal = this.role.grantPrincipal;
      this.policyFragment = this.role.policyFragment;
  
      // Note that we cannot use `cluster.addManifest` here because that would create the manifest
      // constrct in the scope of the cluster stack, which might be a different stack than this one.
      // This means that the cluster stack would depend on this stack because of the role,
      // and since this stack inherintely depends on the cluster stack, we will have a circular dependency.
      new eks.KubernetesManifest(this, `manifest-${id}ServiceAccountResource`, {
        cluster,
        overwrite: true,
        manifest: [{
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: {
            name: this.serviceAccountName,
            namespace: this.serviceAccountNamespace,
            labels: {
              'app.kubernetes.io/name': this.serviceAccountName,
              ...props.labels,
            },
            annotations: {
              'eks.amazonaws.com/role-arn': this.role.roleArn,
              ...props.annotations,
            },
          },
        }],
      });
  
    }
    public addToPrincipalPolicy(statement: iam.PolicyStatement): iam.AddToPrincipalPolicyResult {
        return this.role.addToPrincipalPolicy(statement);
      }
    
      /**
       * If the value is a DNS subdomain name as defined in RFC 1123, from K8s docs.
       *
       * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-subdomain-names
       */
      private isValidDnsSubdomainName(value: string): boolean {
        return value.length <= 253 && /^[a-z0-9]+[a-z0-9-.]*[a-z0-9]+$/.test(value);
      }
    
      /**
       * If the value follows DNS label standard as defined in RFC 1123, from K8s docs.
       *
       * https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names
       */
      private isValidDnsLabelName(value: string): boolean {
        return value.length <= 63 && /^[a-z0-9]+[a-z0-9-]*[a-z0-9]+$/.test(value);
      }
    }

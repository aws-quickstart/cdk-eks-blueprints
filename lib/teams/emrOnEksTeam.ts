import { Cluster, KubernetesManifest } from "aws-cdk-lib/aws-eks";
import { FederatedPrincipal, IManagedPolicy, ManagedPolicy, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Aws, CfnJson, CfnOutput } from "aws-cdk-lib/core";
import * as nsutils from '../utils/namespace-utils';
import * as simplebase from 'simple-base';
import { CfnVirtualCluster } from "aws-cdk-lib/aws-emrcontainers";
import { ClusterInfo, Values } from "../spi";
import { ApplicationTeam, TeamProps } from ".";
import { ManifestDeployment } from "../addons/helm-addon/kubectl-provider";
import { loadYaml, readYamlDocument } from "../utils/yaml-utils";

/**
 * Interface define the object to create an execution role
 */
 export interface ExecutionRoleDefinition {
    /**
     * The name of the IAM role to create
     */
  executionRoleName: string,
  /**
    * The IAM policy to use with IAM role if it already exists
    * Can be initialized for example by `fromPolicyName` in Policy class
    */
  excutionRoleIamPolicy?: IManagedPolicy,
  /**
    * Takes an array of IAM Policy Statement, you should pass this 
    * if you want the Team to create the policy along the IAM role 
    */
  executionRoleIamPolicyStatement?: PolicyStatement[],
}

/**
 * Interface to define a EMR on EKS team
 */
export interface EmrEksTeamProps extends TeamProps {
  /*
  * The namespace of where the virtual cluster will be created
  */ 
  virtualClusterNamespace: string,
  /**
   * To define if the namespace that team will use need to be created
   */
  createNamespace: boolean,
  /*
  * The name of the virtual cluster the team will use
  */ 
  virtualClusterName: string,
  /**
   * List of execution role to associated with the VC namespace
   */
  executionRoles: ExecutionRoleDefinition[]
}

/*
 *This class define the Team that can be used with EMR on EKS
 *The class will create an EMR on EKS Virtual Cluster to use by the team
 *It can either create a namespace or use an existing one
 *The class will set the necessary k8s RBAC needed by EMR on EKS as defined in the AWS documentation 
 * https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html
 * The class constructor take a the EMR on EKS Team definition
 */

export class EmrEksTeam extends ApplicationTeam {

  private emrTeam: EmrEksTeamProps;
    /**
     * @public
     * @param {EmrEksTeamProps} props the EMR on EKS team definition {@link EmrEksTeamProps}
     */
  constructor(props: EmrEksTeamProps) {
    super(props);
    this.emrTeam = props;
  }

  setup(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;

    const emrVcPrerequisit = this.setEmrContainersForNamespace(cluster, this.emrTeam.virtualClusterNamespace, this.emrTeam.createNamespace);

    this.emrTeam.executionRoles.forEach(executionRole => {

      const executionRolePolicy = executionRole.excutionRoleIamPolicy ?
        executionRole.excutionRoleIamPolicy :
        new ManagedPolicy(cluster.stack, `executionRole-${executionRole.executionRoleName}-Policy`, {
          statements: executionRole.executionRoleIamPolicyStatement,
        });

      this.createExecutionRole(
        cluster,
        executionRolePolicy,
        this.emrTeam.virtualClusterNamespace,
        executionRole.executionRoleName);
    });

    const teamVC = new CfnVirtualCluster(cluster.stack, `${this.emrTeam.virtualClusterName}-VirtualCluster`, {
      name: this.emrTeam.virtualClusterName,
      containerProvider: {
        id: cluster.clusterName,
        type: 'EKS',
        info: { eksInfo: { namespace: this.emrTeam.virtualClusterNamespace } },
      },
      tags: [{
        key: 'created-with',
        value: 'cdk-blueprint',
      }],
    });

    teamVC.node.addDependency(emrVcPrerequisit);

    new CfnOutput(cluster.stack, `${this.emrTeam.virtualClusterName}-id`, {
      value: teamVC.attrId
    });

  }
  /**
   * @internal
   * Private method to to apply k8s RBAC to the service account used by EMR on EKS service role
   * For more information on the RBAC read consult the EMR on EKS documentation in this link 
   * https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html
   * This method 
   * @param cluster EKS cluster where to apply the RBAC
   * @param namespace Namespace where the RBAC are applied
   * @param createNamespace flag to create namespace if not already created
   * @returns 
   */

  private setEmrContainersForNamespace(cluster: Cluster, namespace: string, createNamespace: boolean): KubernetesManifest {

  let doc = readYamlDocument(`${__dirname}//emrContainersRbacConfig.ytpl`);
  

  const manifest = doc.split("---").map(e => loadYaml(e));
    

    const values: Values = {};

    //Get the Role definition and add the namespace of the EMR on EKS virtual cluster
    const emrContainersK8sRoleManifest: ManifestDeployment = {
      name: '',
      namespace: namespace,
      manifest,
      values: values
    };

    //Create the role used by EMR on EKS
    const emrContainersK8sRoleResource = cluster.addManifest('emrContainersK8sRoleManifest',
      emrContainersK8sRoleManifest
    );

    if (createNamespace) {
      const namespaceManifest = nsutils.createNamespace(namespace, cluster, true);
      emrContainersK8sRoleResource.node.addDependency(namespaceManifest);
    }

    return emrContainersK8sRoleResource;
  }

  /**
   * @internal
   * private method to create the execution role for EMR on EKS scoped to a namespace and a given IAM role
   * @param cluster EKS cluster
   * @param policy IAM policy to use with the role
   * @param namespace Namespace of the EMR Virtual Cluster
   * @param name Name of the IAM role
   * @returns Role
   */
  private createExecutionRole(cluster: Cluster, policy: IManagedPolicy, namespace: string, name: string): Role {

    const stack = cluster.stack;

    let irsaConditionkey: CfnJson = new CfnJson(stack, `${name}roleIrsaConditionkey'`, {
      value: {
        [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: 'system:serviceaccount:' + namespace + ':emr-containers-sa-*-*-' + Aws.ACCOUNT_ID.toString() + '-' + simplebase.base36.encode(name),
      },
    });

    // Create an execution role assumable by EKS OIDC provider and scoped to the service account of the virtual cluster
    return new Role(stack, `${name}ExecutionRole`, {
      assumedBy: new FederatedPrincipal(
        cluster.openIdConnectProvider.openIdConnectProviderArn,
        {
          StringLike: irsaConditionkey,
        },
        'sts:AssumeRoleWithWebIdentity'),
      roleName: name,
      managedPolicies: [policy],
    });
  }


}

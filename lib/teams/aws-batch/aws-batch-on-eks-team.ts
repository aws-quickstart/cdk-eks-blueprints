import { assertEC2NodeGroup } from "../../cluster-providers";
import { ClusterInfo, Values } from "../../spi";
import { ApplicationTeam, TeamProps } from "../team";
import { KubectlProvider, ManifestDeployment } from "../../addons/helm-addon/kubectl-provider";
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";
import { createNamespace } from "../../utils";

import * as batch from 'aws-cdk-lib/aws-batch';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import * as iam from "aws-cdk-lib/aws-iam";

const NAMESPACE = 'aws-batch';

/**
 * Interface to define an AWS Batch on EKS team
 */
export interface BatchEksTeamProps extends TeamProps {
  /**
   * Name of the team
   */
  name: string,

  /**
   * Namespace name for AWS Batch
   */
  namespace: string

  /**
   * Allocation strategies for EKS Compute environment
   */
  allocationStrategy?: 'BEST_FIT_PROGRESSIVE' | 'SPOT_CAPACITY_OPTIMIZED'

  jobQueueName: string

  priority: number,
}

const defaultProps: BatchEksTeamProps = {
  name: NAMESPACE,
  namespace: NAMESPACE,
  allocationStrategy: 'BEST_FIT_PROGRESSIVE',
  jobQueueName: 'batch-eks-job',
  priority: 10,
};

/*
 *This class define the Team that can be used with AWS Batch on EKS
 */

export class BatchEksTeam extends ApplicationTeam {

  private batchTeam: BatchEksTeamProps;
  /**
   * @public
   * @param {BatchEksTeamProps} props the Batch team definition {@link BatchEksTeamProps}
   */
  constructor(props: BatchEksTeamProps) {
    super({...defaultProps, ...props});
    this.batchTeam = props;
  }

  setup(clusterInfo: ClusterInfo): void {
    const allocStr = this.batchTeam.allocationStrategy || 'BEST_FIT_PROGRESSIVE';

    const AwsBatchAddOn = clusterInfo.getProvisionedAddOn('AwsBatchAddOn');

    if (AwsBatchAddOn === undefined) {
      throw new Error("AwsBatchAddOn must be deployed before creating AWS Batch on EKS team.");
    }

    // Set AWS Batch namespace and necessary RBACs
    const ns = this.setBatchEksNamespace(clusterInfo, this.batchTeam.namespace);

    // Create compute environment
    const computeEnv = this.setComputeEnvironment(clusterInfo, this.batchTeam.namespace, ns, allocStr);

    // Submit a job queue
    const jobQueue = new batch.CfnJobQueue(clusterInfo.cluster.stack,'batch-eks-job-queue',{
      jobQueueName: this.batchTeam.jobQueueName,
      priority: this.batchTeam.priority,
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment: computeEnv.attrComputeEnvironmentArn
        }
      ]
    });

    jobQueue.node.addDependency(computeEnv);
  }
  /**
   * method to to apply k8s RBAC to the service account used by Batch service role
   * @param ClusterInfo EKS cluster where to apply the RBAC
   * @param namespace Namespace where the RBAC are applied
   * @param createNamespace flag to create namespace if not already created
   * @returns 
   */

  private setBatchEksNamespace(clusterInfo: ClusterInfo, namespace: string): eks.KubernetesManifest {

    let doc = readYamlDocument(`${__dirname}/aws-batch-rbac-config.ytpl`);

    //Get the RBAC definition and replace with the namespace provided by the user
    const manifest = doc.split("---").map(e => loadYaml(e));

    const values: Values = {
      namespace: namespace
    };

    const manifestDeployment: ManifestDeployment = {
      name: 'aws-batch-rbacs',
      namespace: namespace,
      manifest,
      values
    };

    const kubectlProvider = new KubectlProvider(clusterInfo);
    const statement = kubectlProvider.addManifest(manifestDeployment);

    const batchEksNamespace = createNamespace(namespace, clusterInfo.cluster, true, true);
    statement.node.addDependency(batchEksNamespace);

    return batchEksNamespace;
  }

  private setComputeEnvironment(clusterInfo: ClusterInfo, namespace: string, nsNode: eks.KubernetesManifest, allocStr: string): batch.CfnComputeEnvironment {
    const nodeGroups = assertEC2NodeGroup(clusterInfo, "Batch Compute Environment");
    const ngRoleNames = nodeGroups.map((ng: eks.Nodegroup | AutoScalingGroup) => {return ng.role.roleName;});
    const cluster = clusterInfo.cluster;
    const ngRole = ngRoleNames[0];

    // Need to create instance profile for the nodegroup role
    const instanceProfile = new iam.CfnInstanceProfile(cluster, 'ng-role-instance-profile',{
      instanceProfileName: ngRole,
      roles: [ngRole]
    });

    const batchComputeEnv = new batch.CfnComputeEnvironment(cluster, "batch-eks-compute-environment", {
      type: 'MANAGED',
      computeEnvironmentName: 'My-Eks-CE',
      state: 'ENABLED',
      eksConfiguration: {
        eksClusterArn: cluster.clusterArn,
        kubernetesNamespace: namespace,
      },
      computeResources: {
        type: "EC2",
        allocationStrategy: allocStr,
        minvCpus: 0,
        maxvCpus: 128,
        instanceTypes: ["m5"],
        subnets: cluster.vpc.publicSubnets.map((e: ec2.ISubnet) => {return e.subnetId;}),
        securityGroupIds: [cluster.clusterSecurityGroupId],
        instanceRole: ngRole,
      }
    });

    batchComputeEnv.node.addDependency(instanceProfile);
    batchComputeEnv.node.addDependency(nsNode);

    return batchComputeEnv;
  } 
}
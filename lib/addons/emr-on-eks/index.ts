import assert = require("assert");
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Stack } from "aws-cdk-lib";
import { Cluster, AccessPolicy, AccessScopeType, AccessPolicyArn } from "aws-cdk-lib/aws-eks-v2";
import { CfnServiceLinkedRole, IRole, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { supportsALL } from "../../utils";

@supportsALL
export class EmrEksAddOn implements ClusterAddOn {
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    assert(clusterInfo.cluster instanceof Cluster, "EmrEksAddOn cannot be used with imported clusters as it requires changes to the cluster authentication.");
    const cluster: Cluster = clusterInfo.cluster;

    /*
    * Create the service role used by EMR on EKS 
    */
    const emrOnEksSlr = new CfnServiceLinkedRole(cluster.stack, 'EmrServiceRole', {
      awsServiceName: 'emr-containers.amazonaws.com',
    });


    //Init the service role as IRole because `addRoleMapping` method does not
    //support the CfnServiceLinkedRole type
    const emrEksServiceRole: IRole = Role.fromRoleArn(
      cluster.stack,
      'ServiceRoleForAmazonEMRContainers',
      `arn:aws:iam::${Stack.of(cluster.stack).account
      }:role/AWSServiceRoleForAmazonEMRContainers`,
    );
    
    //Add the service role to the AwsAuth
    cluster.grantAccess('EMRServiceRoleAccess', emrEksServiceRole.roleArn, [new AccessPolicy({
      accessScope: { type: AccessScopeType.CLUSTER },
      policy: AccessPolicyArn.AMAZON_EKS_CLUSTER_ADMIN_POLICY
    })]);
  
    return Promise.resolve(emrOnEksSlr);
  }
}

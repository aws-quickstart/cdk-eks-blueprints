import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Stack } from "aws-cdk-lib";
import { CfnServiceLinkedRole, IRole, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

const BATCH = 'aws-batch';

export class AwsBatchAddOn implements ClusterAddOn {
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    const roleNameforBatch = 'AWSServiceRoleForBatch';
    const slrCheck = Role.fromRoleName(cluster.stack, 'BatchServiceLinkedRole', roleNameforBatch);

    // Create the service role used by AWS Batch on EKS if one doesn't exist
    if (slrCheck.roleName != roleNameforBatch){
      new CfnServiceLinkedRole(cluster.stack, 'BatchServiceRole', {
        awsServiceName: 'batch.amazonaws.com',
      });
    }    

    //Init the service role as IRole because `addRoleMapping` method does not
    //support the CfnServiceLinkedRole type
    const batchEksServiceRole: IRole = Role.fromRoleArn(
      cluster.stack,
      'ServiceRoleForBatch',
      `arn:aws:iam::${Stack.of(cluster.stack).account}:role/AWSServiceRoleForBatch`,
    );
    
    //Add the service role to the AwsAuth
    cluster.awsAuth.addRoleMapping(
      batchEksServiceRole,
      {
        username: BATCH,
        groups: ['']
      }
    );
  
    return Promise.resolve(batchEksServiceRole);

  }
}
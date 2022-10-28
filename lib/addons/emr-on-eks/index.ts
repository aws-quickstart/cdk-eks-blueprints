import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Stack } from "aws-cdk-lib";
import { CfnServiceLinkedRole, IRole, Role } from "aws-cdk-lib/aws-iam";

export class EmrEksAddOn implements ClusterAddOn {
  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;
    

    /*
    * Create the service role used by EMR on EKS 
    */
    new CfnServiceLinkedRole(cluster.stack, 'EmrServiceRole', {
      awsServiceName: 'emr-containers.amazonaws.com',
    });


    //Init the service role as IRole because `addRoleMapping` method does
    //support the CfnServiceLinkedRole type
    const emrEksServiceRole: IRole = Role.fromRoleArn(
      cluster.stack,
      'ServiceRoleForAmazonEMRContainers',
      `arn:aws:iam::${Stack.of(cluster.stack).account
      }:role/AWSServiceRoleForAmazonEMRContainers`,
    );
    
    //Add the service role to the AwsAuth
    cluster.awsAuth.addRoleMapping(
      emrEksServiceRole,
      {
        username: 'emr-containers',
        groups: ['']
      }
    );

  }
}
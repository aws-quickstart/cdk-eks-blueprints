# EMR on EKS Team

The `EMR on EKS Team` extends the `ApplicationTeam` and allows the EMR on EKS team to manage the namespace where the virtual cluster is deployed. This team **MUST** be used in conjuction with [EMR on EKS AddOn](../addons/emr-eks.md).

The EMR on EKS Team allows you to create a [Virtual Cluster](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/virtual-cluster.html) and job Execution Roles that are used by the job to access data in Amazon S3, AWS Glue Data Catalog or any other AWS resources that you need to interact with. The job execution roles are scoped with IRSA to be only assumed by pods deployed by EMR on EKS in the namespace of the virtual cluster. You can learn more about the condition applied [here](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/iam-execution-role.html). The IAM roles will have the following format: `NAME-AWS_REGION-EKS_CLUSTER_NAME`.


## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.EmrEksAddOn();

//The policy to be attached to the EMR on EKS execution role 
const executionRolePolicyStatement: PolicyStatement [] = [
            new PolicyStatement({
              resources: ['*'],
              actions: ['s3:*'],
            }),
            new PolicyStatement({
              resources: ['*'],   
              actions: ['glue:*'],
            }),
            new PolicyStatement({
              resources: ['*'],
              actions: [
                'logs:*',
              ],
            }),
          ];
      
      const dataTeam: EmrEksTeamProps = {
              name:'dataTeam',
              virtualClusterName: 'batchJob',
              virtualClusterNamespace: 'batchjob',
              createNamespace: true,
              users: [
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user1`),
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user2`)
              ],
              userRoleArn: new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:role/role1`),
              executionRoles: [
                  {
                      executionRoleIamPolicyStatement: executionRolePolicyStatement,
                      executionRoleName: 'myBlueprintExecRole'
                  }
              ]
          };


const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .teams(new blueprints.EmrEksTeam(dataTeam))
  .build(app, 'my-stack-name');
```


## Submit a job

Once you deploy the blueprint you will have as output the Virtual Cluster `id`. You can use the `id` and the execution role for which you supplied a policy to submit jobs. Below you can find an example of a job you can submit with AWS CLI.

```
aws emr-containers start-job-run \
  --virtual-cluster-id=$VIRTUAL_CLUSTER_ID \
  --name=pi-2 \
  --execution-role-arn=$EMR_ROLE_ARN \
  --release-label=emr-6.8.0-latest \
  --job-driver='{
    "sparkSubmitJobDriver": {
      "entryPoint": "local:///usr/lib/spark/examples/src/main/python/pi.py",
      "sparkSubmitParameters": "--conf spark.executor.instances=1 --conf spark.executor.memory=2G --conf spark.executor.cores=1 --conf spark.driver.cores=1"
    }
  }'

```

### Verify job submission

Once you submit a job you can verify that it is running from the AWS console on the EMR service that the job is running. Below you can see a screenshot of the console.

![EMR on EKS job submitted](./../assets/images/emr-eks.png)
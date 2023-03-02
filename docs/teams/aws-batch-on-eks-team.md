# AWS Batch on EKS Team

The `AWS Batch on EKS Team` extends the `ApplicationTeam` and allows the Batch on EKS team to manage the namespace where the Batch Jobs are deployed. This team **MUST** be used in conjuction with [EMR on EKS AddOn](../addons/aws-batch-on-eks.md).

The AWS Batch on EKS Team allows you to create a [Compute Environment](https://docs.aws.amazon.com/batch/latest/userguide/compute-environments-eks.html) and a job queue to attach to the compute environment. Job queues are where jobs are submitted, and where they reside until they can be scheduled in the compute environment.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AwsBatchAddOn();

const batchTeam: BatchEksTeamProps = {
    name: 'batch-a',
    namespace: 'aws-batch',
    envName: 'batch-a-comp-env',
    computeResources: {
        envType: BatchEnvType.EC2,
        allocationStrategy: BatchAllocationStrategy.BEST,
        priority: 10,
        minvCpus: 0,
        maxvCpus: 128,
        instanceTypes: ["m5", "t3.large"]
    },
    jobQueueName: 'team-a-job-queue',
};

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(addOn)
    .teams(new blueprints.BatchEksTeam(batchTeam))
    .build(app, 'my-stack-name');
```


## Create a Job definition

Once you deploy the addon and the team, to run a batch job on EKS, you must first define a job. AWS Batch job definitions specify how jobs are to be run. The following is an example job definition you can set using AWS CLI:

```sh
cat <<EOF > ./batch-eks-job-definition.json
{
  "jobDefinitionName": "MyJobOnEks_Sleep",
  "type": "container",
  "eksProperties": {
    "podProperties": {
      "hostNetwork": true,
      "containers": [
        {
          "image": "public.ecr.aws/amazonlinux/amazonlinux:2",
          "command": [
            "sleep",
            "60"
          ],
          "resources": {
            "limits": {
              "cpu": "1",
              "memory": "1024Mi"
            }
          }
        }
      ]
    }
  }
}
EOF
aws batch register-job-definition --cli-input-json file://./batch-eks-job-definition.json
```

## Submit a Job

Using the job definition, you can define and deploy a specific job using the following example AWS CLI command:

```sh
aws batch submit-job --job-queue team-a-job-queue \
    --job-definition MyJobOnEks_Sleep --job-name My-Eks-Job1
```

You will get an output that lists the Job ID:

```
{
    "jobArn": "arn:aws:batch:us-west-2:123456789012:job/9518c9eb-b261-4732-a38d-54caf1d22229",
    "jobName": "My-Eks-Job1",
    "jobId": "9518c9eb-b261-4732-a38d-54caf1d22229"
}
```

## Verify Job completion

You can see the job by running the following command:

```sh
aws batch describe-jobs --job <jobId-from-submit-response> 
```

```
{
    "jobs": [
        {
            "jobArn": "arn:aws:batch:us-west-2:123456789012:job/9518c9eb-b261-4732-a38d-54caf1d22229",
            "jobName": "My-Eks-Job1",
            "jobId": "9518c9eb-b261-4732-a38d-54caf1d22229",
            "jobQueue": "arn:aws:batch:us-west-2:123456789012:job-queue/team-a-job-queue",
            "status": "RUNNABLE",
            "attempts": [],
            "createdAt": 1676581820093,
            "dependsOn": [],
            "jobDefinition": "arn:aws:batch:us-west-2:123456789012:job-definition/MyJobOnEks_Sleep:1",
            "parameters": {},
            "tags": {},
            "platformCapabilities": [],
            "eksProperties": {
                "podProperties": {
                    "hostNetwork": true,
                    "containers": [
                        {
                            "image": "public.ecr.aws/amazonlinux/amazonlinux:2",
                            "command": [
                                "sleep",
                                "60"
                            ],
                            "args": [],
                            "env": [],
                            "resources": {
                                "limits": {
                                    "memory": "1024Mi",
                                    "cpu": "1"
                                }
                            },
                            "volumeMounts": []
                        }
                    ],
                    "volumes": []
                }
            },
            "eksAttempts": []
        }
    ]
}
```

After a while, you can check that the pod has been created (and eventually deleted after job completion) under the `aws-batch` namespace to run the job:

```sh
kubectl get pod -n aws-batch 
```

You can also check that the job has been completed by running the describe job command again and seeing the output. There should be description of the pod and node assignment for the job under `eksAttempts`:

```
.......................
            "eksAttempts": [
                {
                    "containers": [
                        {
                            "exitCode": 0,
                            "reason": "Completed"
                        }
                    ],
                    "podName": "aws-batch.fa024ec9-4232-3e82-b09b-4ba6ba396ec2",
                    "nodeName": "ip-10-0-81-102.us-west-2.compute.internal",
                    "startedAt": 1676581976000,
                    "stoppedAt": 1676582036000
                }
            ]
.......................
```
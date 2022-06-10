# Keda Add-on

This add-on installs [Keda](https://github.com/kedacore/keda) Kubernetes-based Event Driven Autoscaling.

KEDA allows for fine-grained autoscaling (including to/from zero) for event driven Kubernetes workloads. KEDA serves as a Kubernetes Metrics Server and allows users to define autoscaling rules using a dedicated Kubernetes custom resource definition.

## Usage

```typescript

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
# Normal Usage
# const addOn = new blueprints.addons.KedaAddOn();
# In case of AWS SQS, there is a workaround required when initializing keda (Please refer https://github.com/kedacore/keda/issues/837#issuecomment-789037326 )
const kedaParams = {
    podSecurityContextFsGroup: 1001,
    securityContextRunAsGroup: 1001,
    securityContextRunAsUser: 1001,
    irsaRoles: ["CloudWatchFullAccess", "AmazonSQSFullAccess"]
}
const addOn = new blueprints.addons.KedaAddOn(kedaParams)

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `version`: Version fo the Helm Chart to be used to install Keda
- `kedaOperatorName`: Name of the KEDA operator
- `createServiceAccount`: Specifies whether a service account should be created by Keda. 
- `kedaServiceAccountName`: The name of the service account to use. If not set and create is true, a name is generated.
- `podSecurityContextFsGroup`: PodSecurityContext holds pod-level security attributes and common container settings. fsGroup is a special supplemental group that applies to all containers in a pod. This is an optional attribute, exposed directly in order to make KedaScalar workaroud - https://github.com/kedacore/keda/issues/837#issuecomment-789037326
- `securityContextRunAsUser`: SecurityContext holds security configuration that will be applied to a container. runAsUser is the UID to run the entrypoint of the container process. This is an optional attribute, exposed directly in order to make KedaScalar workaroud - https://github.com/kedacore/keda/issues/837#issuecomment-789037326
- `securityContextRunAsGroup`: SecurityContext holds security configuration that will be applied to a container. runAsGroup is the GID to run the entrypoint of the container process. This is an optional attribute, exposed directly in order to make KedaScalar workaroud - https://github.com/kedacore/keda/issues/837#issuecomment-789037326
- `irsaRoles` - An array of Managed IAM Policies which Service Account needs for IRSA Eg: irsaRoles:["CloudWatchFullAccess","AmazonSQSFullAccess"]. If not empty the Service Account will be created by the CDK with IAM Roles Mapped (IRSA). In case if its empty, Keda will create the Service Account with out IAM Roles
- `values`: Arbitrary values to pass to the chart. Refer to the Keda [Helm Chart documentation](https://github.com/kedacore/charts) for additional details

## Validation

To validate that Keda is installed properly in the cluster, check that the Keda deployments,
services and stateful sets are running.

```shell
  kubectl get deployments -n keda  
```
There should be 2 deployments are created once for operator/agent and another for metrics server

```shell
  kubectl get pods -n keda  
```
There should be 2 pods one startin with name keda-operator- (Eg: "keda-operator-56bb8ddd5b-7fqb7")
Verify IRSA is working properly
```shell
kubectl describe pods keda-operator-8c5967bcd-vlhpd  -n keda | grep -i aws  
```

```shell
  kubectl get sa -n keda
  kubectl describe sa keda-operator -n keda  
```
There should be an Service Account with name KedaOperator created and you can see an annotation on Service Account which have the AWS IAM Role ARN ( with required access for AWS Services like AWS SQS)

## Testing

We will test AWS SQS Scalar here
1) Create SQS Queue in desired region
Replace ${AWS_REGION} with your target region
```shell
    aws sqs create-queue --queue-name keda-test --region ${AWS_REGION} --output json
```
2) Create a deployment with SQS Consumer, For simplicity we will create an nginx deployment (in real case scenarion it should be an SQS Consumer)
After the port-forwarding has started, the application can be accessed by navigating to http://localhost:8080
```shell
kubectl create ns sqs-consumer
kubectl create deployment sqs-consumer --image nginx -n sqs-consumer
```
3) Create SQS Scalar by creating and applying following yaml file for eg: keda-scalar.yaml
Replace ${AWS_REGION} with your target region
```yaml
---
apiVersion: keda.sh/v1alpha1 # https://keda.sh/docs/2.0/concepts/scaling-deployments/
kind: ScaledObject
metadata:
  name: sqs-consumer-keda-scaler
  namespace: sqs-consumer
  labels:
    app: sqs-consumer
    deploymentName: sqs-consumer
spec:
  scaleTargetRef:
    kind: Deployment
    name: sqs-consumer
  minReplicaCount: 1
  maxReplicaCount: 50
  pollingInterval: 10
  cooldownPeriod:  500
  triggers:
  - type: aws-sqs-queue
    metadata:
      queueURL: https://sqs.${AWS_REGION}.amazonaws.com/ACCOUNT_NUMBER/sqs-consumer
      queueLength: "5"
      awsRegion: "${AWS_REGION}"
      identityOwner: operator
---
```
```shell
 kubectl apply -f  keda-scalar.yaml
```
4) Verify HPA is triggered for sqs-consumer namespace
```shell
 kubectl get hpa -n sqs-consumer
```
5) Now send 10 Messages to sqs queue
Replace ${AWS_REGION} with your target region
```shell
x=10
a=0
while [ $a -lt $x ]
do
   aws sqs send-message --region ${AWS_REGION} --endpoint-url https://sqs.${AWS_REGION}.amazonaws.com/ --queue-url https://sqs.${AWS_REGION}.amazonaws.com/ACCOUNT_NUMBER/sqs-consumer  --message-body '{"key": "value"}'
   a=`expr $a + 1`
done

```
6) Verify if the nginx pod is autoscaled to 2 from 1
```shell
 kubectl get pods -n sqs-consumer
```
7) Purge the SQS queue to test scale in event
Replace ${AWS_REGION} with your target region
```shell
aws sqs purge-queue --queue-url https://sqs.${AWS_REGION}.amazonaws.com/CCOUNT_NUMBER/sqs-consumer  
```
6) Verify if the nginx pod is scaledd in from 2 to 1 after teh cool down perion set (500 in this case)
```shell
 kubectl get pods -n sqs-consumer
```
## Functionality

1. Installs keda in the cluster
2. Sets up IRSA so that Pods can interact with AWS Services
3. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).
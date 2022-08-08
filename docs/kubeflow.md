# Kubeflow on EKS
The Kubeflow project is dedicated to making deployments of machine learning (ML) workflows on Kubernetes simple, portable and scalable.
Our goal is not to recreate other services, but to provide a straightforward way to deploy best-of-breed open-source systems for ML to diverse infrastructures.
Anywhere you are running Kubernetes, you should be able to run Kubeflow.

This example deploys the following resources

- Creates EKS Cluster Control plane with public endpoint (for demo purpose only) with a managed node group
- Deploys application load balancer and EBS CSI driver
- Deploy Kubeflow on the EKS cluster

Note: we use EKS 1.21 here which is the latest EKS version supported by Kubeflow. see reference below <br>
https://awslabs.github.io/kubeflow-manifests/docs/about/eks-compatibility/

## Prerequisites:

Ensure that you have installed the following tools on your machine.

1. [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
2. [kubectl](https://Kubernetes.io/docs/tasks/tools/)
3. [cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
4. [Kustomize](https://kubectl.docs.kubernetes.io/installation/kustomize/)
5. [npm] (https://docs.npmjs.com/cli/v8/commands/npm-install)



## Deploy EKS Cluster with Amazon EKS Blueprints for CDK

Clone the repository

```sh
git clone https://github.com/aws-quickstart/cdk-eks-blueprints
```

Create a CDK project, Bootstrap your environment and install dependency 

```sh
cdk init app --language typescript
cdk bootstrap aws://<AWS_ACCOUNT_ID>/<AWS_REGION>
npm i @aws-quickstart/eks-blueprints
```

Replace the contents of bin/<your-main-file>.ts  with the following:
```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

// AddOns for the cluster.
const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.MetricsServerAddOn,
    new blueprints.addons.ClusterAutoScalerAddOn,
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn()
];

const account = 'XXXXXXXXXXXXX'
const region = 'your region'
const props = { env: { account, region } }
new blueprints.EksBlueprint(app, { id: 'kubeflow-eks', addOns}, props)
```

Deploy the stack using the following command
```sh
cdk deploy
```


## Deploy kubeflow
**clone kubeflow source code**
```sh
export KUBEFLOW_RELEASE_VERSION=v1.5.1
export AWS_RELEASE_VERSION=v1.5.1-aws-b1.0.0
git clone https://github.com/awslabs/kubeflow-manifests.git && cd kubeflow-manifests
git checkout ${AWS_RELEASE_VERSION}
git clone --branch ${KUBEFLOW_RELEASE_VERSION} https://github.com/kubeflow/manifests.git upstream
```

If you install kubeflow in non-prod env and would like to access with http

modify /kubeflow-manifests/upstream/apps/pipeline/upstream/base/installs/multi-user/istio-authorization-config.yaml <br>
change<br>

    tls:
      mode: ISTIO_MUTUAL
to:

    tls:
      mode: DISABLE

Modify  
/kubeflow-manifests/upstream/apps/jupyter/jupyter-web-app/upstream/base/deployment.yaml <br>
/kubeflow-manifests/upstream/apps/volumes-web-app/upstream/base/deployment.yaml <br>
by adding the attribute value under env:

        - name: APP_SECURE_COOKIES
          value: "false"

**install kubeflow using kustomize**
```sh
cd kubeflow-manifests
while ! kustomize build deployments/vanilla | kubectl apply -f -; do echo "Retrying to apply resources"; sleep 30; done
```

**Set ALB and default storage class**
```sh
aws eks --region <REGION> update-kubeconfig --name <CLSUTER_NAME>
cd ..
kubectl apply -f ebs-sc.yaml

kubectl patch storageclass ebs-sc -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
kubectl patch storageclass gp2 -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

kubectl apply -f ingress.yaml -n istio-system
```
ebs-sc.yaml file content:
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
```

ingress.yaml file content:
```yaml
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/load-balancer-attributes: routing.http.drop_invalid_header_fields.enabled=true
    alb.ingress.kubernetes.io/scheme: internet-facing
    # alb.ingress.kubernetes.io/scheme: $(loadBalancerScheme)
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}]'
  name: istio-ingress
spec:
  rules:
  - http:
      paths:
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
        path: /*
```



## Verify the resources

Let’s verify the resources created by Steps above.

kubectl get nodes # Output shows the EKS Managed Node group nodes

kubectl get ns | kubeflow # Output shows kubeflow namespace

kubectl get pods --namespace=kubeflow # Output shows kubeflow pods



## Execute Machine learning jobs on Kubeflow
log into Kubeflow UI with default username and password <br>
get URL by running command below
```
kubectl get ingress -n istio-system

username: user@example.com
password: 12341234
```
please change the default username and password by using https://awslabs.github.io/kubeflow-manifests/docs/deployment/vanilla/guide/#change-default-user-password


## Cleanup

To clean up your EKS Blueprints, run the following commands:


```sh
cdk destroy --all
```





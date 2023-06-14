# IBM® Instana® Addon for Amazon EKS Blueprint

The IBM® Instana® Addon for Amazon EKS Blueprint is designed to enhance observability, monitoring, and management capabilities for applications running on Amazon Elastic Kubernetes Service (EKS). IBM Instana collects data from monitored systems by using a single agent on each host. The agent runs on your hosts to collect and aggregate data from various sensors before it sends the data to the Instana backend.

The IBM® Instana® [Addon](https://www.npmjs.com/package/%40nstana/aws-eks-blueprint-addon) focuses on enhancing the user experience by reducing the complexity and time required to install and configure an Instana host agent on Amazon EKS cluster. Once you configure the addon for a Amazon EKS blueprint, it will be automatically provisioned during deployment.

This Addon will use IBM Instana Kubernetes operator in the namespace ```instana-agent``` to install and manage the Instana agent. It also configures custom resource values to configure the operator.

## Prerequisites

### AWS CLI
Refer the following guide to install the AWS CLI

```text
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
```
After installing AWS CLI run following command to configure [AWS CLI](https://docs.aws.amazon.com/cli/latest/reference/configure/)

```shell
aws configure
```

### Node.js and npm
Refer the following guide to install the Node.js and npm

#### Mac
```shell
brew install make
brew install node
```
#### Ubuntu
```shell
sudo apt install make
sudo apt install nodejs
```

### Instana Backend
 Use SaaS (eg [aws](https://aws.amazon.com/marketplace/pp/prodview-hnqy5e3t3fzda?sr=0-1&ref_=beagle&applicationId=AWSMPContessa)) or Install self-hosted Instana backend ([on-premises](https://www.ibm.com/docs/en/instana-observability/current?topic=installing-configuring-self-hosted-instana-backend-premises)).

## Create Project

To create a new project and install dependencies, follow these steps from Amazon EKS Blueprint [Quick Start](https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started)

## Instana Agent Configuration
Go to your Instana installation (Instana User Interface), click ... More > Agents > Installing Instana Agents and select 'Kubernetes' platform to get the Instana Agent Key, Instana Service Endpoint, Instana Service port. These steps are also described [here](https://www.ibm.com/docs/en/instana-observability/218?topic=instana-endpoints-keys) or in the screenshot below.

![Instana Agent Configuration](../assets/images//instana-agent.png)

To set the following environment variables from the CLI, use the corresponding values obtained from the Instana Service Endpoint and Port (as shown in the above screenshot), and the Instana Application Key (also shown in the above screenshot):

- Set the value of **INSTANA_ENDPOINT_HOST_URL** to the Instana Service Endpoint.
- Set the value of **INSTANA_ENDPOINT_HOST_PORT** to the Instana Service Port.
- Set the value of **INSTANA_AGENT_KEY** to the Instana Application Key.

You can choose the names for **AMAZON_EKS_CLUSTER_NAME** and **INSTANA_ZONE_NAME** based on your cluster's name, for example, "eks-blueprint".

Set the value of the following environment variable and run it on CLI to set those variables.

```
export INSTANA_ZONE_NAME=
export AMAZON_EKS_CLUSTER_NAME=
export INSTANA_AGENT_KEY=
export INSTANA_ENDPOINT_HOST_URL=
export INSTANA_ENDPOINT_HOST_PORT=
```

For example:

```
export INSTANA_ZONE_NAME=eks-blueprint
export AMAZON_EKS_CLUSTER_NAME=eks-blueprint
export INSTANA_AGENT_KEY=abc123
export INSTANA_ENDPOINT_HOST_URL=instana.example.com
export INSTANA_ENDPOINT_HOST_PORT="443"
```


## How to use IBM Instana Addon for Amazon EKS Blueprint

Once the project is created, install [eks-blueprints](https://www.npmjs.com/package/@aws-quickstart/eks-blueprints) and [instana-eks-blueprint-addon](https://www.npmjs.com/package/@instana/aws-eks-blueprint-addon) npm package using following command.

```shell
npm i @aws-quickstart/eks-blueprints
```

```shell
npm i @instana/aws-eks-blueprint-addon
```

Go back to the ```bin/<your-main-file>.ts``` and and refer [this code](https://github.com/aws-samples/cdk-eks-blueprints-patterns/blob/main/lib/instana-construct/index.ts) as reference for providing configuration values to Instana Addon.

The above pattern requires a few configurable parameters to configure the operator.

## Bootstraping
Bootstrap your environment with the following command.

```shell
cdk bootstrap
```

and finally you can deploy the stack with the following command.
```shell
cdk deploy
```

## Verify the resources
Run update-kubeconfig command. You should be able to get the command from CDK output message. More information can be found [here](https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/#cluster-access).

```console
aws eks update-kubeconfig --name <your cluster name> --region <your region> --role-arn arn:aws:iam::xxxxxxxxx:role/eks-blue1-eksblue1AccessRole32C5DF05-1NBFCH8INI08A
```

## Testing
To validate if Instana Agent configured properly in Amazon EKS. You can run the following command after Amazon EKS cluster in deployed and running.
```shell
kubectl get pods -n instana-agent
```
Output of the above command will be silimar to below one:

```output
NAMESPACE       NAME                                  				READY   	STATUS    RESTARTS   AGE
instana-agent   controller-manager-78479cb596-sktg9   	1/1     	Running   					0          56m
instana-agent   controller-manager-78479cb596-xz8kn   	1/1     	Running   					0          56m
instana-agent   instana-agent-gsqx8                   				1/1     	Running   					0          56m
```

Run following command to verify Instana Agent logs
```shell
kubectl logs <instana-agent-pod-name> -n instana-agent # Output shows instana agent logs. pod name in this example is instana-agent-gsqx8
```

Once you see Instana Agent is running in your Amazon EKS Cluster, you can go to Instana Installation (User Interface) to get the APM metrices.

![Instana Metrics](../assets/images//instana-metrics.png)

## Cleanup

To clean up your EKS Blueprints, run the following commands:

```sh
cdk destroy
```

## Disclaimer 
This pattern relies on an open source NPM package eks-blueprints-cdk-kubeflow-ext. Please refer to the package npm site for more information.
```
https://www.npmjs.com/package/@instana/aws-eks-blueprint-addon'
```

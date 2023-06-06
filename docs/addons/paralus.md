# Paralus on EKS
The Paralus project is a free, open source tool that enables controlled, audited access to Kubernetes infrastructure. It comes with just-in-time service account creation and user-level credential management that integrates with your RBAC and SSO. [Learn more ..](https://www.paralus.io/)

This pattern deploys the following resources:

- Creates EKS Cluster Control plane with public endpoint (for demo purpose only) with a managed node group
- Deploys supporting add-ons:  AwsLoadBalancerController, VpcCni, KubeProxy, EbsCsiDriverAddOn
- Deploy Paralus on the EKS cluster

NOTE: By default paralus installs few dependent modules like postgres, kratos and also comes with a dashboard. At it's core paralus works atop domain based routing, inter service communication and hence above supporting Add-Ons are required. 

## Prerequisites:

Ensure that you have installed the following tools on your machine.

1. [aws cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
2. [kubectl](https://Kubernetes.io/docs/tasks/tools/)
3. [cdk](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html#getting_started_install)
4. [npm](https://docs.npmjs.com/cli/v8/commands/npm-install)


## Deploy EKS Cluster with Amazon EKS Blueprints for CDK

Clone the repository

```sh
git clone https://github.com/aws-samples/cdk-eks-blueprints-patterns.git
```

Update fqdn information for your installation

```
    fqdn": {
        "domain": <yourdomain.com>,
        "hostname": "console-eks",
        "coreConnectorSubdomain": "*.core-connector.eks",
        "userSubdomain": "*.user.eks"
    }
```

Updating npm

```sh
npm install -g npm@latest
```

To view patterns and deploy paralus pattern

```sh
cdk list
cdk bootstrap
cdk deploy paralus-blueprint
```


## Verify the resources

Run update-kubeconfig command. You should be able to get the command from CDK output message. More information can be found at https://aws-quickstart.github.io/cdk-eks-blueprints/getting-started/#cluster-access
```sh
aws eks update-kubeconfig --name <your cluster name> --region <your region> --role-arn arn:aws:iam::378123694894:role/paralus-blueprint-paralusblueprintMastersRoleF3287-EI3XEBO1107B
```

Let’s verify the resources created by Steps above.
```sh
kubectl get nodes # Output shows the EKS Managed Node group nodes

kubectl get ns | grep paralus # Output shows paralus namespace

kubectl get pods --namespace=paralus-system  # Output shows paralus pods

blueprints-addon-paralus-contour-contour-7857f4cd9-kqhgp   1/1     Running                 
blueprints-addon-paralus-contour-envoy-mx8z7               2/2     Running                 
blueprints-addon-paralus-fluent-bit-525tt                  1/1     Running                 
blueprints-addon-paralus-kratos-588775bc47-wf5gf           2/2     Running                 
blueprints-addon-paralus-kratos-courier-0                  2/2     Running                 
blueprints-addon-paralus-postgresql-0                      1/1     Running                 
dashboard-6d8b54d78b-d8cks                                 1/1     Running                 
paralus-66d9bbf698-qznzl                                   2/2     Running                 
prompt-54d45cff79-h9x95                                    2/2     Running   
relay-server-79448564cb-nf5tj                              2/2     Running              
```

[Learn more](https://www.paralus.io/docs/architecture/core-components) about the various components that are deployed as part of paralus.

## Configure DNS Settings 
Once Paralus is installed continue with following steps to configure DNS settings, reset default password and start using paralus

Obtain the external ip address by executing below command against the installation
`kubectl get svc blueprints-addon-paralus-contour-envoy -n paralus-system`

```
NAME                            TYPE           CLUSTER-IP       EXTERNAL-IP                                                                     PORT(S)                         AGE
blueprints-addon-paralus-contour-envoy         LoadBalancer   10.100.101.216   a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com   80:31810/TCP,443:30292/TCP      10m
```

Update the DNS settings to add CNAME records
```
    name: console-eks 
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
    
    name: *.core-connector.eks  
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
    
    name: *.user.eks 
    value: a814da526d40d4661bf9f04d66ca53b5-65bfb655b5662d24.elb.us-west-2.amazonaws.com
```

Obtain your default password and reset it upon first login

`kubectl logs -f --namespace paralus-system $(kubectl get pods --namespace paralus-system -l app.kubernetes.io/name='paralus' -o jsonpath='{ .items[0].metadata.name }') initialize | grep 'Org Admin default password:'`

You can now access dashboard with http://console-eks.<yourdomain.com> ( refers to the hostname.domain specified during installation ), start importing clusters and using paralus.

Note: you can also refer to this [paralus eks blogpost](https://www.paralus.io/blog/eks-quickstart#configuring-dns-settings)

## Paralus Features & Usage 
https://www.paralus.io/docs/usage/

## Configuring centralized kubectl access to clusters
Kubectl is one of the most widely used tools to work with Kubernetes. The command line tool allows you to deploy applications, inspect and manage resources. It basically authenticates with the control plane for your cluster and makes API calls to the Kubernetes API. In short if you are working with Kubernetes - you will use kubectl the most.

In most modern day scenarios, there are multiple users who are accessing various clusters. This makes it all more important to ensure that every user or group has access to only those resources that they are allowed to. Few ways to achieve this is using namespaces and role based access control. While these are good, most enterprise grade application deployments require something more robust.

That’s where Paralus comes in. It allows you to configure centralized kubectl access to multiple clusters all from a single dashboard. It allows you to create groups, assign projects and users and provide access. In this blog post, we’ll show you how to import different clusters to Paralus and configure access to them. All of this with zero trust principles built in. [Read More](https://www.paralus.io/blog/centralized-kubectl-access#the-use-case)

## Cleanup

To clean up your EKS Blueprints, run the following commands:


```sh
cdk destroy paralus-blueprint 

```

## Troubleshooting
If postgres pvc is not getting a volume allocated, it probably is due to the iam permissions. Please refer this https://docs.aws.amazon.com/eks/latest/userguide/csi-iam-role.html to assign approriate policies to kubernetes sa

## Disclaimer 
This pattern relies on an open source NPM package paralus-eks-blueprints-addon. Please refer to the package npm site for more information.
https://www.npmjs.com/package/@paralus/paralus-eks-blueprints-addon

If you have any questions about the npm package or find any defect, please post in the source repo at 
https://github.com/paralus/eks-blueprints-addon
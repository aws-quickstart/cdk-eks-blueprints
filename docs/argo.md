# Deploying workloads with ArgoCD

This guide will walk you through how to deploy workloads to your cluster with ArgoCD. This approach leverages the [App of Apps](https://argoproj.github.io/argo-cd/operator-manual/cluster-bootstrapping/#app-of-apps-pattern) pattern to deploy multiple workloads arcoss multiple namespaces. The sample app of apps repository that we use in this walkthrough can be found [here](https://github.com/kcoleman731/argo-apps.git).

## Install ArgoCD CLI

Follow the instructions found [here](https://argoproj.github.io/argo-cd/cli_installation/) as it will include instructions for your specific OS. You can test that the ArgoCD CLI was installed correctly using the following:

```
argocd version --short --client
```

You should see output similar to the following:

```
argocd: v1.8.7+eb3d1fb.dirty
```

## Exposing ArgoCD

To access the ArgoCD running in your Kubernetes cluster, we need to change the service type of the ArgoCD Server from `ClusterIP` to `LoadBalancer`. 

To do so, first capture the service name in an environment variable.

```
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 
```

Next, patch the service type. 

```
kubectl patch $ARGO_SERVER -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

To verfiy the service is updated, print the Kubernetes service resource details.

```
kubectl get $ARGO_SERVER -n argocd
```

You should see output similar to the following.

```
argocd-server           LoadBalancer   172.20.206.128   afa3926d3e4174c2d8ae2b278d9f8703-1595693244.us-east-2.elb.amazonaws.com   80:32215/TCP,443:32242/TCP   3h41m
argocd-server-metrics   ClusterIP      172.20.92.95     <none>                                                                    8083/TCP                     3h41m
```

## Logging Into ArgoCD

ArgoCD will create an `admin` user and password on a fresh install. To get the ArgoCD admin password, run the following.

```
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

Next, grab the External IP of the LoadBalancer.

```
export ARGO_LB=$(kubectl get $ARGO_SERVER -n argocd -o jsonpath="{.status.loadBalancer.ingress[0].hostname}")
```

Login via the following.

```
argocd login $ARGO_LB --username admin --password $ARGO_PASSWORD
```

Note, the Load Balancer takes a few minutes to provision. If you see an error like the following, wait a few minutes and try again. 

```
FATA[0000] dial tcp: lookup a930ff6f293e3495bb4133f581c0261c-2091079303.us-west-1.elb.amazonaws.com: no such host
```

## Register EKS cluster with Argo

To beging deploying applications to your EKS cluster via ArgoCD, we first need to register our cluster with ArgoCD. Grab the name of your EKS cluster. 

```
kubectl config get-contexts -o name
```

You should see an output similar as the following which is your cluster ARN.

```
arn:aws:eks:us-east-2:XXXXXXXXXXXX:cluster/<CLUSTER_NAME>
```

Register your cluster using the following command

```
argocd cluster add <CLUSTER_ARN>
```

If the cluster was added successfully you should see output similar to the following

```
INFO[0001] ServiceAccount "argocd-manager" created in namespace "kube-system"
INFO[0001] ClusterRole "argocd-manager-role" created
INFO[0001] ClusterRoleBinding "argocd-manager-role-binding" created
Cluster 'https://CC307FF827597118E788BCF9B6D5E7BB.gr7.us-east-2.eks.amazonaws.com' added
```

## Deploy workloads to your cluster

Create a project in Argo by running the following command

```
argocd proj create sample -d https://kubernetes.default.svc,djl-web
```

Add the App of Apps repository to Argo for the project.

```
argocd proj add-source sample https://github.com/kcoleman731/argo-apps.git
```

Create the application within Argo by running the following command

```
argocd app create sample-apps --dest-namespace argocd  --dest-server https://kubernetes.default.svc  --repo https://github.com/kcoleman731/argo-apps.git --path "."
```

Sync the apps by running the following command

```
argocd app sync sample-apps 
```

If everything worked you should see an output similar to the following 

```
IMESTAMP                  GROUP              KIND    NAMESPACE                  NAME     STATUS   HEALTH        HOOK  MESSAGE
2021-05-05T08:16:11-07:00  argoproj.io  Application      argocd  team-riker-guestbook     Synced  Healthy              application.argoproj.io/team-riker-guestbook unchanged
2021-05-05T08:16:11-07:00  argoproj.io  Application      argocd           inf-backend     Synced  Healthy              application.argoproj.io/inf-backend unchanged
2021-05-05T08:16:11-07:00  argoproj.io  Application      argocd  team-burnham-workload    Synced  Healthy              application.argoproj.io/team-burnham-workload unchanged

Name:               apps
Project:            default
Server:             https://kubernetes.default.svc
Namespace:          argocd
URL:                https://a0ced7668eff2472081dab3beb914a20-1563903189.us-east-2.elb.amazonaws.com/applications/apps
Repo:               https://github.com/shapirov103/argo-apps.git
Target:
Path:               .
SyncWindow:         Sync Allowed
Sync Policy:        <none>
Sync Status:        Synced to  (40af6c1)
Health Status:      Healthy

Operation:          Sync
Sync Revision:      40af6c15705188b604f4632760289d2a5985ddbd
Phase:              Succeeded
Start:              2021-05-05 08:16:10 -0700 PDT
Finished:           2021-05-05 08:16:11 -0700 PDT
Duration:           1s
Message:            successfully synced (all tasks run)

GROUP        KIND         NAMESPACE  NAME                   STATUS  HEALTH   HOOK  MESSAGE
argoproj.io  Application  argocd     team-riker-guestbook   Synced  Healthy        application.argoproj.io/team-riker-guestbook unchanged
argoproj.io  Application  argocd     inf-backend            Synced  Healthy        application.argoproj.io/inf-backend unchanged
argoproj.io  Application  argocd     team-burnham-workload  Synced  Healthy        application.argoproj.io/team-burnham-workload unchanged
```

## Validate deployments. 

To validate your deployments, leverage kubectl port-forwarding to access the `guestbook-ui` service for `team-burnham`.

```
kubectl port-forward svc/guestbook-ui -n team-burnham 8080:80
```

Open up `localhost:8080` in your browser and you should see the application. 



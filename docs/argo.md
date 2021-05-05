# Boostrap Cluster with the Uber App

This guide will walk you through how to boostrap your cluster with the Uber application found [here](https://github.com/shapirov103/argo-apps) using ArgoCD. Clone the repo that contains all the artifacts that we will need - https://github.com/shapirov103/argo-apps

## Install the ArgoCD CLI

Follow the instructions found [here](https://argoproj.github.io/argo-cd/cli_installation/) as it will include instructions for your specific OS. You can test that the ArgoCD CLI was installed correctly using the following:
```
argocd version
```

You should see a similar output as below
```
argocd: v2.0.1+33eaf11
  BuildDate: 2021-04-15T22:34:01Z
  GitCommit: 33eaf11e3abd8c761c726e815cbb4b6af7dcb030
  GitTreeState: clean
  GoVersion: go1.16
  Compiler: gc
  Platform: darwin/amd64
argocd-server: v1.7.6+b04c25e
  BuildDate: 2020-09-19T00:52:04Z
  GitCommit: b04c25eca8f1660359e325acd4be5338719e59a0
  GitTreeState: clean
  GoVersion: go1.14.1
  Compiler: gc
  Platform: linux/amd64
  Ksonnet Version: v0.13.1
  Kustomize Version: {Version:kustomize/v3.6.1 GitCommit:c97fa946d576eb6ed559f17f2ac43b3b5a8d5dbd BuildDate:2020-05-27T20:47:35Z GoOs:linux GoArch:amd64}
  Helm Version: version.BuildInfo{Version:"v3.2.0", GitCommit:"e11b7ce3b12db2941e90399e874513fbd24bcb71", GitTreeState:"clean", GoVersion:"go1.13.10"}
  Kubectl Version: v1.17.8
```
## Login to Argo 
The next thing we need is the name of the load balancer that is created. Run the following command to get the name of your load balancer
```
kubectl get svc -n argocd | grep argocd-server
```
You should see the following output
```
argocd-server           LoadBalancer   172.20.206.128   afa3926d3e4174c2d8ae2b278d9f8703-1595693244.us-east-2.elb.amazonaws.com   80:32215/TCP,443:32242/TCP   3h41m
argocd-server-metrics   ClusterIP      172.20.92.95     <none>                                                                    8083/TCP                     3h41m
```

Next we need to change the argocd-server service type to `LoadBalancer`. Run the following command
```
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

Run the following command to get the password for logging in to ArgoCD
```
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server -o name | cut -d'/' -f 2
```

Copy and paste the full load balancer name and then run the following command
```
argocd login <name of your load balancer>
```

It will then prompt you for a username and password. The username will be `admin`. The password will be the output of running the command above.

## Register the Cluster to Argo
Run the following command to list all cluster contexts in your current kubeconfig
```
kubectl config get-contexts -o name
```

You should see an output similar as the following
```
arn:aws:eks:us-east-2:XXXXXXXXXXXX:cluster/east-test-1
minikube
```

Register your cluster using the following command
```
argocd cluster add arn:aws:eks:us-east-2:XXXXXXXXXXXX:cluster/east-test-1
```

If the cluster was added successfully you should see an output similar to the following
```
INFO[0001] ServiceAccount "argocd-manager" created in namespace "kube-system"
INFO[0001] ClusterRole "argocd-manager-role" created
INFO[0001] ClusterRoleBinding "argocd-manager-role-binding" created
Cluster 'https://CC307FF827597118E788BCF9B6D5E7BB.gr7.us-east-2.eks.amazonaws.com' added
```


## Create Argo Project
Create a project in Argo by running the following command
```
argocd proj create webteam -d https://kubernetes.default.svc,djl-web
```

Run the following command to add the application repository to Argo
```
argocd proj add-source webteam https://github.com/shapirov103/argo-apps.git
```

Next run the following command to create the application within Argo by running the following command
```
argocd app create apps --dest-namespace argocd  --dest-server https://kubernetes.default.svc  --repo git@github.com:shapirov103/argo-apps.git --path "."
```

Sync the apps by running the following command
```
argocd app sync apps 
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


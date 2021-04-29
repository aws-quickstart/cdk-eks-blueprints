# Boostrap Cluster with the Uber App

This guide will walk you through how to boostrap your cluster with the Uber application found [here](https://github.com/shapirov103/argo-apps) using ArgoCD. Clone the repo that contains all the artifacts that we will need - https://github.com/shapirov103/argo-apps

## Install ArgoCD and the ArgoCD CLI

Follow the instructions found [here](https://argoproj.github.io/argo-cd/cli_installation/) as it will include instructions for your specific OS.

The next step is to run the file that will install ArgoCD to our cluster. 

You will see a file named `argocd-install.sh`. This file will bootstrap your cluster with ArgoCD. 

Run the following commands 
```
chmod +x argocd-install.sh
```
```
./argocd-install.sh
```

The next thing we need is the name of the load balancer that is created. Run the following command to get the name of your load balancer
```
kubectl get svc -n argocd | grep argocd-server
```
You should see the following output
```
argocd-server           LoadBalancer   172.20.206.128   afa3926d3e4174c2d8ae2b278d9f8703-1595693244.us-east-2.elb.amazonaws.com   80:32215/TCP,443:32242/TCP   3h41m
argocd-server-metrics   ClusterIP      172.20.92.95     <none>                                                                    8083/TCP                     3h41m
```
Run the following command to get the password for logging in to ArgoCD
```
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Copy and paste the full load balancer name and then run the following command
```
argocd login <name of your load balancer>
```

It will then prompt you for a username and password. The username will be `admin`. 







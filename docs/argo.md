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

To access the ArgoCD running in your Kubernetes cluster, we simply need leverage port-forwarding.

To do so, first capture the service name in an environment variable.

```
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 
```

Next, in a new terminal tab, expose the service locally.

```
kubectl port-forward $ARGO_SERVER -n argocd 8080:443
```

Open your browser to http://localhost:8080 and you should see the Argo login screen.

## Logging Into ArgoCD

ArgoCD will create an `admin` user and password on a fresh install. To get the ArgoCD admin password, run the following.

```
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

While still port-forwarding, login via the following.

```
argocd login localhost:8080 --username admin --password $ARGO_PASSWORD
```

## Deploy workloads to your cluster

Create a project in Argo by running the following command

```
argocd proj create sample \
    -d https://kubernetes.default.svc
    -s https://github.com/kcoleman731/argo-apps.git
```

Create the application within Argo by running the following command

```
argocd app create sample-apps \
    --dest-namespace argocd  \
    --dest-server https://kubernetes.default.svc  \
    --repo https://github.com/kcoleman731/argo-apps.git \
    --path "."
```

Sync the apps by running the following command

```
argocd app sync sample-apps 
```

## Validate deployments. 

To validate your deployments, leverage kubectl port-forwarding to access the `guestbook-ui` service for `team-burnham`.

```
kubectl port-forward svc/guestbook-ui -n team-burnham 4040:80
```

Open up `localhost:4040` in your browser and you should see the application. 



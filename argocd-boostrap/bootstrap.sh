#!/bin/sh
echo "checking ArgoCD version on the server"
argocd version --short --client  

echo "change argocd-server service type to load balancer"
export ARGO_SERVER=$(kubectl get svc -n argocd -l app.kubernetes.io/name=argocd-server -o name) 

echo "set argocd password as env variable" 
export ARGO_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo "login to the server and change password"
argocd login $ARGO_SERVER --username admin --password $ARGO_PASSWORD 

echo "bootstrap app of apps"
argocd app create apps --dest-namespace argocd  --dest-server https://kubernetes.default.svc  --repo git@github.com:shapirov103/argo-apps.git --path "."

# echo "mount secret obtained in step above and mount it as a secret to this job"
# echo "updated argocd password"
# argocd account update-password
# echo "create EKS cluster configuration"
# CONTEXT_NAME=`kubectl config view -o jsonpath='{.contexts[].name}'`
# argocd cluster add $CONTEXT_NAME
# echo "bootstrap app of apps"
# argocd app create apps --dest-namespace argocd  --dest-server https://kubernetes.default.svc  --repo git@github.com:shapirov103/argo-apps.git --path "."
# argocd app sync apps     
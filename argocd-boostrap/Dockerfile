FROM argoproj/argocd:latest

# Switch to root for the ability to perform install
USER root

# Install tools needed 
RUN apt-get update && \
    apt-get install -y \
        curl \
        argocd \
        jq \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    curl --silent "https://api.github.com/repos/argoproj/argo-cd/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')&& \
    chmod +x /usr/local/bin/argocd

# Switch back to non-root user
USER argocd
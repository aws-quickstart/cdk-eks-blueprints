FROM alpine:latest

# Install tools needed - curl, unzip, python utilities, awscli, argocd
RUN apk update \
    && apk --no-cache add curl \
    && apk --no-cache add unzip \
    && apk --no-cache add python3 \
    && apk --no-cache add py3-pip \
    && pip3 install --upgrade pip \
    && pip3 install \
        awscli \
    && rm -rf /var/cache/apk/* \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install -i /usr/local/aws-cli -b /usr/local/bin \
    && curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64 \ 
    && chmod +x /usr/local/bin/argocd

# CMD []
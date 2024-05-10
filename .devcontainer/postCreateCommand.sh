#!/usr/bin/env bash

# For Kubectl AMD64 / x86_64
[ $(uname -m) = x86_64 ] && curl -sLO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
# For Kubectl ARM64
[ $(uname -m) = aarch64 ] && curl -sLO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/arm64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl

# For Helm
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
echo "Installing 'helm' utility ..."
./get_helm.sh
rm -rf get_helm.sh

# setup autocomplete for kubectl and alias k
mkdir $HOME/.kube
chsh -s $(which zsh)
echo "source <(kubectl completion bash)" >> $HOME/.zshrc
echo "alias k=kubectl" >> $HOME/.zshrc
echo "alias cdk='npx cdk'" >> $HOME/.zshrc
echo "complete -F __start_kubectl k" >> $HOME/.zshrc

# Add Tools for Syntax Highlighting, Auto Suggestions, command shortcurts with oh-my-zsh for AWS, Kubectl, Node, Git.
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"
git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
sed -i "/plugins=(git)/c 'plugins=(git docker kubectl zsh-syntax-highlighting zsh-autosuggestions zsh-interactive-cd node aws)'" ~/.zshrc
source ~/.zshrc
# #!/bin/sh

echo Running script ./.devcontainer/init.sh

################################################################################
# Set get pull mode to rebase. 
runuser -l node -c 'cd /work && git config pull.rebase true'
runuser -l node -c 'cd /work && git config branch.autosetuprebase always'

echo Script ./.devcontainer/init.sh finished
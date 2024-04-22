FROM node:20.12.2
# Last version check on 10 Apr 2024.
# Check for new versions at https://nodejs.org/en/ or at https://hub.docker.com/_/node

################################################################################
# Upgrade NPM
# node may come with an older version of npm. Ensure we have a specific npm.
RUN npm install -g npm@10.5.2
# Last version check on 10 Apr 2024.
# Newer versions might be available at https://www.npmjs.com/search?q=npm


################################################################################
# Install prerequisites
RUN apt-get update
RUN apt-get install -y \
    lsb-release \
    curl \
    awscli

################################################################################
# Install aws-cdk 
RUN npm install -g aws-cdk@2.133.0
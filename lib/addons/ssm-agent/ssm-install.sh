#!/usr/bin/env bash

echo '* * * * * root yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm && rm -rf /etc/cron.d/ssmstart' > /etc/cron.d/ssmstart
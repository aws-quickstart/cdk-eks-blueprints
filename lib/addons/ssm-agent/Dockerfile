FROM amazonlinux:2

RUN yum update -y

COPY ssm-install.sh /opt/ssm-install.sh

CMD ["/bin/bash", "/opt/ssm-install.sh"]
export interface AckChartMapping {
    chart: string,
    version: string,
    managedPolicyName: string
}

export const enum AckServiceName {
  IAM = "iam",
  RDS = "rds",
  EC2 = "ec2"
}
  
export const serviceMappings : { [key in AckServiceName]?: AckChartMapping } = 
{
    "iam": {
      chart: "iam-chart",
      version:  "v0.0.13",
      managedPolicyName: "IAMFullAccess"
    },
<<<<<<< HEAD
    [AckServiceName.RDS]: {
      chart: "rds-chart",
      version:  "v0.1.1",
      managedPolicyName: "AmazonRDSFullAccess"
    },
    [AckServiceName.EC2]: {
      chart: "ec2-chart",
      version:  "v0.1.0",
      managedPolicyName: "AmazonRDSFullAccess"
=======
    "rds": {
      chart: "iam-chart",
      version:  "v0.0.13",
      managedPolicyName: "IAMFullAccess"
>>>>>>> f36ce25720ae0689c3e329a489d5479d401de406
    }
};

import { AckServiceName } from ".";

export interface AckChartMapping {
    chart: string,
    version: string,
    managedPolicyName: string
}
  
export const serviceMappings : { [key in AckServiceName]?: AckChartMapping } = 
{
    "iam": {
      chart: "iam-chart",
      version:  "v0.0.13",
      managedPolicyName: "IAMFullAccess"
    },
    "rds": {
      chart: "iam-chart",
      version:  "v0.0.13",
      managedPolicyName: "IAMFullAccess"
    }
};

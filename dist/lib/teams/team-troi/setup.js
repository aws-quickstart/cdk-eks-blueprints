"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamTroiSetup = void 0;
const cdk = require("@aws-cdk/core");
const s3 = require("@aws-cdk/aws-s3");
class TeamTroiSetup {
    constructor() {
        this.teamName = 'team-troi';
    }
    setup(clusterInfo) {
        const cluster = clusterInfo.cluster;
        const stack = cluster.stack;
        const namespace = cluster.addManifest(this.teamName, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
                name: this.teamName,
                annotations: { "argocd.argoproj.io/sync-wave": "-1" }
            }
        });
        this.setupNamespacePolicies(cluster);
        const sa = cluster.addServiceAccount('inf-backend', { name: 'inf-backend', namespace: this.teamName });
        sa.node.addDependency(namespace);
        const bucket = new s3.Bucket(stack, 'inf-backend-bucket');
        bucket.grantReadWrite(sa);
        new cdk.CfnOutput(stack, this.teamName + 'sa-iam-role', { value: sa.role.roleArn });
    }
    setupNamespacePolicies(cluster) {
        const quotaName = this.teamName + "-quota";
        cluster.addManifest(quotaName, {
            apiVersion: 'v1',
            kind: 'ResourceQuota',
            metadata: { name: quotaName },
            spec: {
                hard: {
                    'requests.cpu': '10',
                    'requests.memory': '10Gi',
                    'limits.cpu': '20',
                    'limits.memory': '20Gi'
                }
            }
        });
    }
}
exports.TeamTroiSetup = TeamTroiSetup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvdGVhbXMvdGVhbS10cm9pL3NldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFDQUFxQztBQUVyQyxzQ0FBc0M7QUFJdEMsTUFBYSxhQUFhO0lBQTFCO1FBQ2EsYUFBUSxHQUFXLFdBQVcsQ0FBQztJQXVDNUMsQ0FBQztJQXJDRyxLQUFLLENBQUMsV0FBd0I7UUFDMUIsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzVCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUNuQixXQUFXLEVBQUUsRUFBRSw4QkFBOEIsRUFBRSxJQUFJLEVBQUU7YUFDeEQ7U0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFckMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUMxRCxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxhQUFhLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxPQUFvQjtRQUN2QyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMzQyxPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRTtZQUMzQixVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsZUFBZTtZQUNyQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQzdCLElBQUksRUFBRTtnQkFDRixJQUFJLEVBQUU7b0JBQ0YsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLGlCQUFpQixFQUFFLE1BQU07b0JBQ3pCLFlBQVksRUFBRSxJQUFJO29CQUNsQixlQUFlLEVBQUUsTUFBTTtpQkFDMUI7YUFDSjtTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUM7Q0FDSjtBQXhDRCxzQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBla3MgZnJvbSBcIkBhd3MtY2RrL2F3cy1la3NcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJAYXdzLWNkay9hd3MtczNcIjtcbmltcG9ydCB7IENsdXN0ZXJJbmZvLCBUZWFtU2V0dXAgfSBmcm9tICcuLi8uLi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFjayc7XG5cblxuZXhwb3J0IGNsYXNzIFRlYW1Ucm9pU2V0dXAgaW1wbGVtZW50cyBUZWFtU2V0dXAge1xuICAgIHJlYWRvbmx5IHRlYW1OYW1lOiBzdHJpbmcgPSAndGVhbS10cm9pJztcblxuICAgIHNldHVwKGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbykge1xuICAgICAgICBjb25zdCBjbHVzdGVyID0gY2x1c3RlckluZm8uY2x1c3RlcjtcbiAgICAgICAgY29uc3Qgc3RhY2sgPSBjbHVzdGVyLnN0YWNrO1xuICAgICAgICBjb25zdCBuYW1lc3BhY2UgPSBjbHVzdGVyLmFkZE1hbmlmZXN0KHRoaXMudGVhbU5hbWUsIHtcbiAgICAgICAgICAgIGFwaVZlcnNpb246ICd2MScsXG4gICAgICAgICAgICBraW5kOiAnTmFtZXNwYWNlJyxcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy50ZWFtTmFtZSxcbiAgICAgICAgICAgICAgICBhbm5vdGF0aW9uczogeyBcImFyZ29jZC5hcmdvcHJvai5pby9zeW5jLXdhdmVcIjogXCItMVwiIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5zZXR1cE5hbWVzcGFjZVBvbGljaWVzKGNsdXN0ZXIpO1xuXG4gICAgICAgIGNvbnN0IHNhID0gY2x1c3Rlci5hZGRTZXJ2aWNlQWNjb3VudCgnaW5mLWJhY2tlbmQnLCB7IG5hbWU6ICdpbmYtYmFja2VuZCcsIG5hbWVzcGFjZTogdGhpcy50ZWFtTmFtZSB9KTtcbiAgICAgICAgc2Eubm9kZS5hZGREZXBlbmRlbmN5KG5hbWVzcGFjZSk7XG4gICAgICAgIGNvbnN0IGJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc3RhY2ssICdpbmYtYmFja2VuZC1idWNrZXQnKTtcbiAgICAgICAgYnVja2V0LmdyYW50UmVhZFdyaXRlKHNhKTtcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQoc3RhY2ssIHRoaXMudGVhbU5hbWUgKyAnc2EtaWFtLXJvbGUnLCB7IHZhbHVlOiBzYS5yb2xlLnJvbGVBcm4gfSlcbiAgICB9XG5cbiAgICBzZXR1cE5hbWVzcGFjZVBvbGljaWVzKGNsdXN0ZXI6IGVrcy5DbHVzdGVyKSB7XG4gICAgICAgIGNvbnN0IHF1b3RhTmFtZSA9IHRoaXMudGVhbU5hbWUgKyBcIi1xdW90YVwiO1xuICAgICAgICBjbHVzdGVyLmFkZE1hbmlmZXN0KHF1b3RhTmFtZSwge1xuICAgICAgICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgICAgICAgIGtpbmQ6ICdSZXNvdXJjZVF1b3RhJyxcbiAgICAgICAgICAgIG1ldGFkYXRhOiB7IG5hbWU6IHF1b3RhTmFtZSB9LFxuICAgICAgICAgICAgc3BlYzoge1xuICAgICAgICAgICAgICAgIGhhcmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgJ3JlcXVlc3RzLmNwdSc6ICcxMCcsXG4gICAgICAgICAgICAgICAgICAgICdyZXF1ZXN0cy5tZW1vcnknOiAnMTBHaScsXG4gICAgICAgICAgICAgICAgICAgICdsaW1pdHMuY3B1JzogJzIwJyxcbiAgICAgICAgICAgICAgICAgICAgJ2xpbWl0cy5tZW1vcnknOiAnMjBHaSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufSJdfQ==
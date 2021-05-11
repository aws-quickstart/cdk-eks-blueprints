"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkEksBlueprintStack = exports.EksBlueprintProps = void 0;
const cdk = require("@aws-cdk/core");
const ec2 = require("@aws-cdk/aws-ec2");
const aws_eks_1 = require("@aws-cdk/aws-eks");
const ec2_cluster_provider_1 = require("../cluster-providers/ec2-cluster-provider");
class EksBlueprintProps {
    constructor() {
        /**
         * Add-ons if any.
         */
        this.addOns = [];
        /**
         * Teams if any
         */
        this.teams = [];
        /**
         * EC2 or Fargate are supported in the blueprint but any implementation conforming the interface
         * will work
         */
        this.clusterProvider = new ec2_cluster_provider_1.EC2ClusterProvider;
        /**
         * Kubernetes version (must be initialized for addons to work properly)
         */
        this.version = aws_eks_1.KubernetesVersion.V1_19;
    }
}
exports.EksBlueprintProps = EksBlueprintProps;
class CdkEksBlueprintStack extends cdk.Stack {
    constructor(scope, blueprintProps, props) {
        var _a, _b, _c;
        super(scope, blueprintProps.id, props);
        /*
         * Supported parameters
        */
        const vpcId = this.node.tryGetContext("vpc");
        const vpc = this.initializeVpc(vpcId);
        const clusterProvider = (_a = blueprintProps.clusterProvider) !== null && _a !== void 0 ? _a : new ec2_cluster_provider_1.EC2ClusterProvider;
        const clusterInfo = clusterProvider.createCluster(this, vpc, (_b = blueprintProps.version) !== null && _b !== void 0 ? _b : aws_eks_1.KubernetesVersion.V1_19);
        for (let addOn of ((_c = blueprintProps.addOns) !== null && _c !== void 0 ? _c : [])) { // must iterate in the strict order
            addOn.deploy(clusterInfo);
        }
        if (blueprintProps.teams != null) {
            blueprintProps.teams.forEach(team => team.setup(clusterInfo));
        }
    }
    initializeVpc(vpcId) {
        const id = this.node.id;
        let vpc = undefined;
        if (vpcId != null) {
            if (vpcId === "default") {
                console.log(`looking up completely default VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { isDefault: true });
            }
            else {
                console.log(`looking up non-default ${vpcId} VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { vpcId: vpcId });
            }
        }
        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
            vpc = new ec2.Vpc(this, id + "-vpc");
        }
        return vpc;
    }
}
exports.CdkEksBlueprintStack = CdkEksBlueprintStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWtzLWJsdWVwcmludC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxQ0FBcUM7QUFDckMsd0NBQXdDO0FBSXhDLDhDQUF5RTtBQUV6RSxvRkFBK0U7QUFFL0UsTUFBYSxpQkFBaUI7SUFBOUI7UUFTSTs7V0FFRztRQUNNLFdBQU0sR0FBeUIsRUFBRSxDQUFDO1FBRTNDOztXQUVHO1FBQ00sVUFBSyxHQUFzQixFQUFFLENBQUM7UUFDdkM7OztXQUdHO1FBQ00sb0JBQWUsR0FBcUIsSUFBSSx5Q0FBa0IsQ0FBQztRQUVwRTs7V0FFRztRQUNNLFlBQU8sR0FBdUIsMkJBQWlCLENBQUMsS0FBSyxDQUFDO0lBRW5FLENBQUM7Q0FBQTtBQTdCRCw4Q0E2QkM7QUFFRCxNQUFhLG9CQUFxQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBRS9DLFlBQVksS0FBb0IsRUFBRSxjQUFpQyxFQUFFLEtBQWtCOztRQUNuRixLQUFLLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkM7O1VBRUU7UUFDRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXRDLE1BQU0sZUFBZSxTQUFHLGNBQWMsQ0FBQyxlQUFlLG1DQUFJLElBQUkseUNBQWtCLENBQUM7UUFFakYsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxRQUFFLGNBQWMsQ0FBQyxPQUFPLG1DQUFJLDJCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWhILEtBQUssSUFBSSxLQUFLLElBQUksT0FBQyxjQUFjLENBQUMsTUFBTSxtQ0FBSSxFQUFFLENBQUMsRUFBRSxFQUFFLG1DQUFtQztZQUNsRixLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1NBQzdCO1FBQ0QsSUFBSSxjQUFjLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtZQUM5QixjQUFjLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUNqRTtJQUNMLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBYTtRQUN2QixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN4QixJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUM7UUFFcEIsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1lBQ2YsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO2dCQUNyQixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7Z0JBQ2pELEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ3BFO2lCQUFNO2dCQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEtBQUssTUFBTSxDQUFDLENBQUM7Z0JBQ25ELEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO2FBQ2pFO1NBQ0o7UUFFRCxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDYix5SEFBeUg7WUFDekgsdUhBQXVIO1lBQ3ZILHdJQUF3STtZQUN4SSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUM7U0FDeEM7UUFFRCxPQUFPLEdBQUcsQ0FBQztJQUNmLENBQUM7Q0FDSjtBQTdDRCxvREE2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tIFwiQGF3cy1jZGsvYXdzLWVjMlwiO1xuaW1wb3J0IHsgU3RhY2tQcm9wcyB9IGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0IHsgSVZwYyB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1lYzInO1xuaW1wb3J0IHsgQXV0b1NjYWxpbmdHcm91cCB9IGZyb20gJ0Bhd3MtY2RrL2F3cy1hdXRvc2NhbGluZyc7XG5pbXBvcnQgeyBDbHVzdGVyLCBLdWJlcm5ldGVzVmVyc2lvbiwgTm9kZWdyb3VwIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWVrcyc7XG5cbmltcG9ydCB7IEVDMkNsdXN0ZXJQcm92aWRlciB9IGZyb20gJy4uL2NsdXN0ZXItcHJvdmlkZXJzL2VjMi1jbHVzdGVyLXByb3ZpZGVyJztcblxuZXhwb3J0IGNsYXNzIEVrc0JsdWVwcmludFByb3BzIHtcblxuICAgIHJlYWRvbmx5IGlkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBEZWZhdWx0cyB0byBpZCBpZiBub3QgcHJvdmlkZWRcbiAgICAgKi9cbiAgICByZWFkb25seSBuYW1lPzogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQWRkLW9ucyBpZiBhbnkuXG4gICAgICovXG4gICAgcmVhZG9ubHkgYWRkT25zPzogQXJyYXk8Q2x1c3RlckFkZE9uPiA9IFtdO1xuXG4gICAgLyoqXG4gICAgICogVGVhbXMgaWYgYW55XG4gICAgICovXG4gICAgcmVhZG9ubHkgdGVhbXM/OiBBcnJheTxUZWFtU2V0dXA+ID0gW107XG4gICAgLyoqXG4gICAgICogRUMyIG9yIEZhcmdhdGUgYXJlIHN1cHBvcnRlZCBpbiB0aGUgYmx1ZXByaW50IGJ1dCBhbnkgaW1wbGVtZW50YXRpb24gY29uZm9ybWluZyB0aGUgaW50ZXJmYWNlXG4gICAgICogd2lsbCB3b3JrXG4gICAgICovXG4gICAgcmVhZG9ubHkgY2x1c3RlclByb3ZpZGVyPzogQ2x1c3RlclByb3ZpZGVyID0gbmV3IEVDMkNsdXN0ZXJQcm92aWRlcjtcblxuICAgIC8qKlxuICAgICAqIEt1YmVybmV0ZXMgdmVyc2lvbiAobXVzdCBiZSBpbml0aWFsaXplZCBmb3IgYWRkb25zIHRvIHdvcmsgcHJvcGVybHkpXG4gICAgICovXG4gICAgcmVhZG9ubHkgdmVyc2lvbj86IEt1YmVybmV0ZXNWZXJzaW9uID0gS3ViZXJuZXRlc1ZlcnNpb24uVjFfMTk7XG5cbn1cblxuZXhwb3J0IGNsYXNzIENka0Vrc0JsdWVwcmludFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcblxuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQ29uc3RydWN0LCBibHVlcHJpbnRQcm9wczogRWtzQmx1ZXByaW50UHJvcHMsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgYmx1ZXByaW50UHJvcHMuaWQsIHByb3BzKTtcbiAgICAgICAgLypcbiAgICAgICAgICogU3VwcG9ydGVkIHBhcmFtZXRlcnNcbiAgICAgICAgKi9cbiAgICAgICAgY29uc3QgdnBjSWQgPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dChcInZwY1wiKTtcbiAgICAgICAgY29uc3QgdnBjID0gdGhpcy5pbml0aWFsaXplVnBjKHZwY0lkKTtcblxuICAgICAgICBjb25zdCBjbHVzdGVyUHJvdmlkZXIgPSBibHVlcHJpbnRQcm9wcy5jbHVzdGVyUHJvdmlkZXIgPz8gbmV3IEVDMkNsdXN0ZXJQcm92aWRlcjtcblxuICAgICAgICBjb25zdCBjbHVzdGVySW5mbyA9IGNsdXN0ZXJQcm92aWRlci5jcmVhdGVDbHVzdGVyKHRoaXMsIHZwYywgYmx1ZXByaW50UHJvcHMudmVyc2lvbiA/PyBLdWJlcm5ldGVzVmVyc2lvbi5WMV8xOSk7XG5cbiAgICAgICAgZm9yIChsZXQgYWRkT24gb2YgKGJsdWVwcmludFByb3BzLmFkZE9ucyA/PyBbXSkpIHsgLy8gbXVzdCBpdGVyYXRlIGluIHRoZSBzdHJpY3Qgb3JkZXJcbiAgICAgICAgICAgIGFkZE9uLmRlcGxveShjbHVzdGVySW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJsdWVwcmludFByb3BzLnRlYW1zICE9IG51bGwpIHtcbiAgICAgICAgICAgIGJsdWVwcmludFByb3BzLnRlYW1zLmZvckVhY2godGVhbSA9PiB0ZWFtLnNldHVwKGNsdXN0ZXJJbmZvKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0aWFsaXplVnBjKHZwY0lkOiBzdHJpbmcpOiBJVnBjIHtcbiAgICAgICAgY29uc3QgaWQgPSB0aGlzLm5vZGUuaWQ7XG4gICAgICAgIGxldCB2cGMgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKHZwY0lkICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmICh2cGNJZCA9PT0gXCJkZWZhdWx0XCIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9va2luZyB1cCBjb21wbGV0ZWx5IGRlZmF1bHQgVlBDYCk7XG4gICAgICAgICAgICAgICAgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsIGlkICsgXCItdnBjXCIsIHsgaXNEZWZhdWx0OiB0cnVlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgbG9va2luZyB1cCBub24tZGVmYXVsdCAke3ZwY0lkfSBWUENgKTtcbiAgICAgICAgICAgICAgICB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgaWQgKyBcIi12cGNcIiwgeyB2cGNJZDogdnBjSWQgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodnBjID09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIEl0IHdpbGwgYXV0b21hdGljYWxseSBkaXZpZGUgdGhlIHByb3ZpZGVkIFZQQyBDSURSIHJhbmdlLCBhbmQgY3JlYXRlIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzIHBlciBBdmFpbGFiaWxpdHkgWm9uZS5cbiAgICAgICAgICAgIC8vIE5ldHdvcmsgcm91dGluZyBmb3IgdGhlIHB1YmxpYyBzdWJuZXRzIHdpbGwgYmUgY29uZmlndXJlZCB0byBhbGxvdyBvdXRib3VuZCBhY2Nlc3MgZGlyZWN0bHkgdmlhIGFuIEludGVybmV0IEdhdGV3YXkuXG4gICAgICAgICAgICAvLyBOZXR3b3JrIHJvdXRpbmcgZm9yIHRoZSBwcml2YXRlIHN1Ym5ldHMgd2lsbCBiZSBjb25maWd1cmVkIHRvIGFsbG93IG91dGJvdW5kIGFjY2VzcyB2aWEgYSBzZXQgb2YgcmVzaWxpZW50IE5BVCBHYXRld2F5cyAob25lIHBlciBBWikuXG4gICAgICAgICAgICB2cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCBpZCArIFwiLXZwY1wiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB2cGM7XG4gICAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsdXN0ZXJQcm92aWRlciB7XG4gICAgY3JlYXRlQ2x1c3RlcihzY29wZTogY2RrLkNvbnN0cnVjdCwgdnBjOiBJVnBjLCB2ZXJzaW9uOiBLdWJlcm5ldGVzVmVyc2lvbik6IENsdXN0ZXJJbmZvO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsdXN0ZXJBZGRPbiB7XG4gICAgZGVwbG95KGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVhbVNldHVwIHtcbiAgICBzZXR1cChjbHVzdGVySW5mbzogQ2x1c3RlckluZm8pOiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsdXN0ZXJJbmZvIHtcblxuICAgIHJlYWRvbmx5IGNsdXN0ZXI6IENsdXN0ZXI7XG5cbiAgICAvKipcbiAgICAgKiBFaXRoZXIgYW5kIEVLUyBOb2RlR3JvdXAgZm9yIG1hbmFnZWQgbm9kZSBncm91cHMsIG9yIGFuZCBhdXRvc2NhbGluZyBncm91cCBmb3Igc2VsZi1tYW5hZ2VkLlxuICAgICAqL1xuICAgIHJlYWRvbmx5IG5vZGVHcm91cD86IE5vZGVncm91cDtcblxuICAgIHJlYWRvbmx5IGF1dG9zY2FsaW5nR3JvdXA/OiBBdXRvU2NhbGluZ0dyb3VwO1xuXG4gICAgcmVhZG9ubHkgdmVyc2lvbjogS3ViZXJuZXRlc1ZlcnNpb247XG59XG4iXX0=
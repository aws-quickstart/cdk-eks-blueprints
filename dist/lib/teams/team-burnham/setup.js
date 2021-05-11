"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamBurnhamSetup = void 0;
class TeamBurnhamSetup {
    setup(clusterInfo) {
        clusterInfo.cluster.addManifest('team-burnham', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-burnham' }
        });
    }
}
exports.TeamBurnhamSetup = TeamBurnhamSetup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvdGVhbXMvdGVhbS1idXJuaGFtL3NldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsZ0JBQWdCO0lBQ3pCLEtBQUssQ0FBQyxXQUF3QjtRQUMxQixXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUU7WUFDNUMsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFLFdBQVc7WUFDakIsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRTtTQUNyQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUFSRCw0Q0FRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENsdXN0ZXJJbmZvLCBUZWFtU2V0dXAgfSBmcm9tICcuLi8uLi9zdGFja3MvZWtzLWJsdWVwcmludC1zdGFjayc7XG5cbmV4cG9ydCBjbGFzcyBUZWFtQnVybmhhbVNldHVwIGltcGxlbWVudHMgVGVhbVNldHVwIHtcbiAgICBzZXR1cChjbHVzdGVySW5mbzogQ2x1c3RlckluZm8pIHtcbiAgICAgICAgY2x1c3RlckluZm8uY2x1c3Rlci5hZGRNYW5pZmVzdCgndGVhbS1idXJuaGFtJywge1xuICAgICAgICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgICAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ3RlYW0tYnVybmhhbScgfVxuICAgICAgICB9KTtcbiAgICB9XG59Il19
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamRikerSetup = void 0;
class TeamRikerSetup {
    setup(clusterInfo) {
        clusterInfo.cluster.addManifest('team-riker', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-riker' }
        });
    }
}
exports.TeamRikerSetup = TeamRikerSetup;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9saWIvdGVhbXMvdGVhbS1yaWtlci9zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSxNQUFhLGNBQWM7SUFDdkIsS0FBSyxDQUFDLFdBQXdCO1FBQzFCLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFlBQVksRUFBRTtZQUMxQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUUsV0FBVztZQUNqQixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFO1NBQ25DLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQVJELHdDQVFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2x1c3RlckluZm8sIFRlYW1TZXR1cCB9IGZyb20gJy4uLy4uL3N0YWNrcy9la3MtYmx1ZXByaW50LXN0YWNrJztcblxuXG5leHBvcnQgY2xhc3MgVGVhbVJpa2VyU2V0dXAgaW1wbGVtZW50cyBUZWFtU2V0dXAge1xuICAgIHNldHVwKGNsdXN0ZXJJbmZvOiBDbHVzdGVySW5mbykge1xuICAgICAgICBjbHVzdGVySW5mby5jbHVzdGVyLmFkZE1hbmlmZXN0KCd0ZWFtLXJpa2VyJywge1xuICAgICAgICAgICAgYXBpVmVyc2lvbjogJ3YxJyxcbiAgICAgICAgICAgIGtpbmQ6ICdOYW1lc3BhY2UnLFxuICAgICAgICAgICAgbWV0YWRhdGE6IHsgbmFtZTogJ3RlYW0tcmlrZXInIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==
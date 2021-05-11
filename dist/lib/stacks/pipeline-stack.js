"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineStack = exports.FactoryApplication = void 0;
const core_1 = require("@aws-cdk/core");
const eks_blueprint_stack_1 = require("./eks-blueprint-stack");
const pipelines_1 = require("@aws-cdk/pipelines");
const codepipeline = require("@aws-cdk/aws-codepipeline");
const actions = require("@aws-cdk/aws-codepipeline-actions");
class FactoryApplication extends core_1.Stage {
    constructor(scope, id, props) {
        super(scope, id, props);
        new eks_blueprint_stack_1.CdkEksBlueprintStack(this, { id: 'eks' });
    }
}
exports.FactoryApplication = FactoryApplication;
class PipelineStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();
        const pipeline = new pipelines_1.CdkPipeline(this, 'FactoryPipeline', {
            pipelineName: 'FactoryPipeline',
            cloudAssemblyArtifact,
            sourceAction: new actions.GitHubSourceAction({
                actionName: 'GitHub',
                output: sourceArtifact,
                oauthToken: core_1.SecretValue.secretsManager('github-token'),
                // Replace these with your actual GitHub project name
                owner: 'shapirov103',
                repo: 'cdk-eks-blueprint',
                branch: 'main',
            }),
            synthAction: pipelines_1.SimpleSynthAction.standardNpmSynth({
                sourceArtifact,
                cloudAssemblyArtifact,
                // Use this if you need a build step (if you're not using ts-node
                // or if you have TypeScript Lambdas that need to be compiled).
                buildCommand: 'npm run build',
            }),
        });
        // Do this as many times as necessary with any account and region
        // Account and region may different from the pipeline's.
        pipeline.addApplicationStage(new FactoryApplication(this, 'dev', {
            env: {
                account: "929819487611",
                region: 'us-east-2'
            }
        }));
        // Do this as many times as necessary with any account and region
        // Account and region may different from the pipeline's.
        pipeline.addApplicationStage(new FactoryApplication(this, 'staging', {
            env: {
                account: "929819487611",
                region: 'us-east-2'
            }
        }));
    }
}
exports.PipelineStack = PipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9saWIvc3RhY2tzL3BpcGVsaW5lLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdDQUE2RjtBQUM3RiwrREFBNkQ7QUFDN0Qsa0RBQW9FO0FBQ3BFLDBEQUEwRDtBQUMxRCw2REFBNkQ7QUFFN0QsTUFBYSxrQkFBbUIsU0FBUSxZQUFLO0lBQ3pDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEIsSUFBSSwwQ0FBb0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0NBQ0o7QUFMRCxnREFLQztBQUVELE1BQWEsYUFBYyxTQUFRLFlBQUs7SUFDcEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUN4RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLGNBQWMsR0FBRyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNuRCxNQUFNLHFCQUFxQixHQUFHLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTFELE1BQU0sUUFBUSxHQUFHLElBQUksdUJBQVcsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDdEQsWUFBWSxFQUFFLGlCQUFpQjtZQUMvQixxQkFBcUI7WUFFckIsWUFBWSxFQUFFLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDO2dCQUN6QyxVQUFVLEVBQUUsUUFBUTtnQkFDcEIsTUFBTSxFQUFFLGNBQWM7Z0JBQ3RCLFVBQVUsRUFBRSxrQkFBVyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUM7Z0JBQ3RELHFEQUFxRDtnQkFDckQsS0FBSyxFQUFFLGFBQWE7Z0JBQ3BCLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLE1BQU0sRUFBRSxNQUFNO2FBQ2pCLENBQUM7WUFFRixXQUFXLEVBQUUsNkJBQWlCLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzVDLGNBQWM7Z0JBQ2QscUJBQXFCO2dCQUNyQixpRUFBaUU7Z0JBQ2pFLCtEQUErRDtnQkFDL0QsWUFBWSxFQUFFLGVBQWU7YUFDaEMsQ0FBQztTQUNMLENBQUMsQ0FBQztRQUVILGlFQUFpRTtRQUNqRSx3REFBd0Q7UUFDeEQsUUFBUSxDQUFDLG1CQUFtQixDQUFDLElBQUksa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM3RCxHQUFHLEVBQUU7Z0JBQ0QsT0FBTyxFQUFFLGNBQWM7Z0JBQ3ZCLE1BQU0sRUFBRSxXQUFXO2FBQ3RCO1NBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixpRUFBaUU7UUFDakUsd0RBQXdEO1FBQ3hELFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDakUsR0FBRyxFQUFFO2dCQUNELE9BQU8sRUFBRSxjQUFjO2dCQUN2QixNQUFNLEVBQUUsV0FBVzthQUN0QjtTQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztDQUNKO0FBL0NELHNDQStDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCwgU2VjcmV0VmFsdWUsIFN0YWNrLCBTdGFja1Byb3BzLCBTdGFnZSwgU3RhZ2VQcm9wcyB9IGZyb20gXCJAYXdzLWNkay9jb3JlXCI7XG5pbXBvcnQgeyBDZGtFa3NCbHVlcHJpbnRTdGFjayB9IGZyb20gXCIuL2Vrcy1ibHVlcHJpbnQtc3RhY2tcIjtcbmltcG9ydCB7IENka1BpcGVsaW5lLCBTaW1wbGVTeW50aEFjdGlvbiB9IGZyb20gJ0Bhd3MtY2RrL3BpcGVsaW5lcyc7XG5pbXBvcnQgKiBhcyBjb2RlcGlwZWxpbmUgZnJvbSAnQGF3cy1jZGsvYXdzLWNvZGVwaXBlbGluZSc7XG5pbXBvcnQgKiBhcyBhY3Rpb25zIGZyb20gJ0Bhd3MtY2RrL2F3cy1jb2RlcGlwZWxpbmUtYWN0aW9ucyc7XG5cbmV4cG9ydCBjbGFzcyBGYWN0b3J5QXBwbGljYXRpb24gZXh0ZW5kcyBTdGFnZSB7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFnZVByb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuICAgICAgICBuZXcgQ2RrRWtzQmx1ZXByaW50U3RhY2sodGhpcywgeyBpZDogJ2VrcycgfSk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgUGlwZWxpbmVTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgICAgY29uc3Qgc291cmNlQXJ0aWZhY3QgPSBuZXcgY29kZXBpcGVsaW5lLkFydGlmYWN0KCk7XG4gICAgICAgIGNvbnN0IGNsb3VkQXNzZW1ibHlBcnRpZmFjdCA9IG5ldyBjb2RlcGlwZWxpbmUuQXJ0aWZhY3QoKTtcblxuICAgICAgICBjb25zdCBwaXBlbGluZSA9IG5ldyBDZGtQaXBlbGluZSh0aGlzLCAnRmFjdG9yeVBpcGVsaW5lJywge1xuICAgICAgICAgICAgcGlwZWxpbmVOYW1lOiAnRmFjdG9yeVBpcGVsaW5lJyxcbiAgICAgICAgICAgIGNsb3VkQXNzZW1ibHlBcnRpZmFjdCxcblxuICAgICAgICAgICAgc291cmNlQWN0aW9uOiBuZXcgYWN0aW9ucy5HaXRIdWJTb3VyY2VBY3Rpb24oe1xuICAgICAgICAgICAgICAgIGFjdGlvbk5hbWU6ICdHaXRIdWInLFxuICAgICAgICAgICAgICAgIG91dHB1dDogc291cmNlQXJ0aWZhY3QsXG4gICAgICAgICAgICAgICAgb2F1dGhUb2tlbjogU2VjcmV0VmFsdWUuc2VjcmV0c01hbmFnZXIoJ2dpdGh1Yi10b2tlbicpLFxuICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgdGhlc2Ugd2l0aCB5b3VyIGFjdHVhbCBHaXRIdWIgcHJvamVjdCBuYW1lXG4gICAgICAgICAgICAgICAgb3duZXI6ICdzaGFwaXJvdjEwMycsXG4gICAgICAgICAgICAgICAgcmVwbzogJ2Nkay1la3MtYmx1ZXByaW50JyxcbiAgICAgICAgICAgICAgICBicmFuY2g6ICdtYWluJywgLy8gZGVmYXVsdDogJ21hc3RlcidcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzeW50aEFjdGlvbjogU2ltcGxlU3ludGhBY3Rpb24uc3RhbmRhcmROcG1TeW50aCh7XG4gICAgICAgICAgICAgICAgc291cmNlQXJ0aWZhY3QsXG4gICAgICAgICAgICAgICAgY2xvdWRBc3NlbWJseUFydGlmYWN0LFxuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGlzIGlmIHlvdSBuZWVkIGEgYnVpbGQgc3RlcCAoaWYgeW91J3JlIG5vdCB1c2luZyB0cy1ub2RlXG4gICAgICAgICAgICAgICAgLy8gb3IgaWYgeW91IGhhdmUgVHlwZVNjcmlwdCBMYW1iZGFzIHRoYXQgbmVlZCB0byBiZSBjb21waWxlZCkuXG4gICAgICAgICAgICAgICAgYnVpbGRDb21tYW5kOiAnbnBtIHJ1biBidWlsZCcsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRG8gdGhpcyBhcyBtYW55IHRpbWVzIGFzIG5lY2Vzc2FyeSB3aXRoIGFueSBhY2NvdW50IGFuZCByZWdpb25cbiAgICAgICAgLy8gQWNjb3VudCBhbmQgcmVnaW9uIG1heSBkaWZmZXJlbnQgZnJvbSB0aGUgcGlwZWxpbmUncy5cbiAgICAgICAgcGlwZWxpbmUuYWRkQXBwbGljYXRpb25TdGFnZShuZXcgRmFjdG9yeUFwcGxpY2F0aW9uKHRoaXMsICdkZXYnLCB7XG4gICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICBhY2NvdW50OiBcIjkyOTgxOTQ4NzYxMVwiLFxuICAgICAgICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgICAvLyBEbyB0aGlzIGFzIG1hbnkgdGltZXMgYXMgbmVjZXNzYXJ5IHdpdGggYW55IGFjY291bnQgYW5kIHJlZ2lvblxuICAgICAgICAvLyBBY2NvdW50IGFuZCByZWdpb24gbWF5IGRpZmZlcmVudCBmcm9tIHRoZSBwaXBlbGluZSdzLlxuICAgICAgICBwaXBlbGluZS5hZGRBcHBsaWNhdGlvblN0YWdlKG5ldyBGYWN0b3J5QXBwbGljYXRpb24odGhpcywgJ3N0YWdpbmcnLCB7XG4gICAgICAgICAgICBlbnY6IHtcbiAgICAgICAgICAgICAgICBhY2NvdW50OiBcIjkyOTgxOTQ4NzYxMVwiLFxuICAgICAgICAgICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMidcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cbn0iXX0=
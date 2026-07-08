import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as blueprints from '../lib';
import { Template } from 'aws-cdk-lib/assertions';

describe('Unit tests for AssociateAccessPolicy', () => {

    test("Creates AwsCustomResource with associateAccessPolicy on create", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .capabilities({
                argocd: new blueprints.capabilities.ArgoCapability({
                    idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
                    additionalAccessPolicies: [
                        eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {
                            accessScopeType: eks.AccessScopeType.CLUSTER,
                        }),
                    ],
                }),
            })
            .build(app, 'access-policy-create');

        const template = Template.fromStack(stack);
        const customResources = template.findResources("Custom::AWS");
        const associateCalls = Object.values(customResources).filter(r => {
            const create = r.Properties?.Create;
            const createStr = typeof create === 'string' ? create : JSON.stringify(create);
            return createStr.includes('associateAccessPolicy');
        });
        expect(associateCalls.length).toEqual(1);
    });

    test("Includes disassociateAccessPolicy on delete", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .capabilities({
                argocd: new blueprints.capabilities.ArgoCapability({
                    idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
                    additionalAccessPolicies: [
                        eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {
                            accessScopeType: eks.AccessScopeType.CLUSTER,
                        }),
                    ],
                }),
            })
            .build(app, 'access-policy-delete');

        const template = Template.fromStack(stack);
        const customResources = template.findResources("Custom::AWS");
        const associateCall = Object.values(customResources).find(r => {
            const create = r.Properties?.Create;
            const createStr = typeof create === 'string' ? create : JSON.stringify(create);
            return createStr.includes('associateAccessPolicy');
        });
        expect(associateCall).toBeDefined();
        const deleteStr = typeof associateCall!.Properties.Delete === 'string'
            ? associateCall!.Properties.Delete
            : JSON.stringify(associateCall!.Properties.Delete);
        expect(deleteStr).toContain('disassociateAccessPolicy');
    });

    test("Namespace-scoped policy includes namespaces in parameters", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .capabilities({
                argocd: new blueprints.capabilities.ArgoCapability({
                    idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
                    additionalAccessPolicies: [
                        eks.AccessPolicy.fromAccessPolicyName("AmazonEKSAdminPolicy", {
                            accessScopeType: eks.AccessScopeType.NAMESPACE,
                            namespaces: ["argocd", "my-app"],
                        }),
                    ],
                }),
            })
            .build(app, 'access-policy-namespaced');

        const template = Template.fromStack(stack);
        const customResources = template.findResources("Custom::AWS");
        const associateCall = Object.values(customResources).find(r => {
            const create = r.Properties?.Create;
            const createStr = typeof create === 'string' ? create : JSON.stringify(create);
            return createStr.includes('associateAccessPolicy');
        });
        expect(associateCall).toBeDefined();
        const createStr = typeof associateCall!.Properties.Create === 'string'
            ? associateCall!.Properties.Create
            : JSON.stringify(associateCall!.Properties.Create);
        expect(createStr).toContain('namespace');
        expect(createStr).toContain('argocd');
        expect(createStr).toContain('my-app');
    });

    test("Multiple policies create multiple custom resources", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .capabilities({
                argocd: new blueprints.capabilities.ArgoCapability({
                    idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
                    additionalAccessPolicies: [
                        eks.AccessPolicy.fromAccessPolicyName("AmazonEKSClusterAdminPolicy", {
                            accessScopeType: eks.AccessScopeType.CLUSTER,
                        }),
                        eks.AccessPolicy.fromAccessPolicyName("AmazonEKSAdminPolicy", {
                            accessScopeType: eks.AccessScopeType.NAMESPACE,
                            namespaces: ["argocd"],
                        }),
                    ],
                }),
            })
            .build(app, 'access-policy-multiple');

        const template = Template.fromStack(stack);
        const customResources = template.findResources("Custom::AWS");
        const associateCalls = Object.values(customResources).filter(r => {
            const create = r.Properties?.Create;
            const createStr = typeof create === 'string' ? create : JSON.stringify(create);
            return createStr.includes('associateAccessPolicy');
        });
        expect(associateCalls.length).toEqual(2);
    });

    test("No custom resources created when additionalAccessPolicies is absent", () => {
        const app = new cdk.App();

        const stack = blueprints.EksBlueprint.builder()
            .account('123456789').region('us-west-1')
            .version("auto")
            .capabilities({
                argocd: new blueprints.capabilities.ArgoCapability({
                    idcInstanceArn: "arn:aws:sso:::instance/ssoins-1234567890abcdef",
                }),
            })
            .build(app, 'access-policy-none');

        const template = Template.fromStack(stack);
        const customResources = template.findResources("Custom::AWS");
        const associateCalls = Object.values(customResources).filter(r => {
            const create = r.Properties?.Create;
            const createStr = typeof create === 'string' ? create : JSON.stringify(create);
            return createStr.includes('associateAccessPolicy');
        });
        expect(associateCalls.length).toEqual(0);
    });

});

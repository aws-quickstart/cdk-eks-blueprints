import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Role } from "aws-cdk-lib/aws-iam";
import * as blueprints from "../../lib";
import { EksBlueprint, GlobalResources } from "../../lib";
import { cloneDeep } from "../../lib/utils";
import * as nutil from 'node:util/types';
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";

describe("ResourceProxy",() => {

    test("When object containing a proxy as value is cloned with cloneDeep, proxy is transferred by reference", () => {
        
        const proxy = blueprints.getNamedResource("someresourcename");
        console.log(`proxy is ${nutil.isProxy(proxy)}`);
        const values : blueprints.Values = {
            id: 1,
            proxy
        };

        const cloned = cloneDeep(values);
        const fn = cloned.proxy[blueprints.utils.sourceFunction];
        
        expect(fn).toBeDefined();
        expect(cloned.proxy).toBe(proxy);
    });

    test("When a stack is created with proxy for mastersRole in cluster provider, multiple stack can use it safely", () => {
        const app = new App();
        
        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_23,
            mastersRole: blueprints.getResource(context => {
                return Role.fromRoleName(context.scope, "mastersRole", "myrole");
            }),
        });

        const builder = EksBlueprint.builder()
            .clusterProvider(clusterProvider)
            .account("123456789012")
            .region("us-east-1");

        const stack1 = builder.build(app, "resource-cluster");
        const template = Template.fromStack(stack1);
        
        const stack2 = builder.build(new App(), "resource-cluster2");
        const template1 = Template.fromStack(stack2);
        // Then
        expect(JSON.stringify(template.toJSON())).toContain(':iam::123456789012:role/myrole');
        expect(nutil.isProxy(clusterProvider.props.mastersRole)).toBeTruthy();

        
        expect(JSON.stringify(template1.toJSON())).toContain(':iam::123456789012:role/myrole');
        expect(nutil.isProxy(clusterProvider.props.mastersRole)).toBeTruthy();
    });

    test("When a stack is created with proxy for securityGroup in cluster provider, stack is created with proxy resolved", () => {
        const app = new App();
        
        const sgDescription = "My new security group";
        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_23,
            mastersRole: blueprints.getResource(context => {
                return Role.fromRoleName(context.scope, "mastersRole", "myrole");
            }),
            securityGroup: blueprints.getResource(context => {
                return new SecurityGroup(context.scope, 'ControlPlaneSG', {
                    vpc: context.get(GlobalResources.Vpc)!,
                    description: sgDescription
                  });
            })
        });

        const builder = EksBlueprint.builder()
            .clusterProvider(clusterProvider)
            .account("123456789012")
            .region("us-east-1");

        const stack1 = builder.build(app, "resource-cluster");
        const template = Template.fromStack(stack1);
        const templateString = JSON.stringify(template.toJSON());
        expect(templateString).toContain(':iam::123456789012:role/myrole');
        expect(templateString).toContain('ControlPlaneSG');
        expect(templateString).toContain(sgDescription);
        expect(nutil.isProxy(clusterProvider.props.securityGroup)).toBeTruthy();
    });

});
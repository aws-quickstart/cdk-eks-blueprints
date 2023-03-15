import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { SecurityGroup } from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Key } from "aws-cdk-lib/aws-kms";
import * as nutil from 'node:util/types';
import * as blueprints from "../../lib";
import { AppMeshAddOn, EksBlueprint, GlobalResources, CreateKmsKeyProvider } from "../../lib";
import { cloneDeep, logger } from "../../lib/utils";


beforeAll(() => logger.settings.minLevel = 2); // debug

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
            version: KubernetesVersion.V1_24,
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
            version: KubernetesVersion.V1_24,
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

    test("When a stack is created with kms key, dereferenced expression for keyArn can be passed to add-ons", () => {
        const app = new App();
        
        const kmsKey: Key = blueprints.getNamedResource(GlobalResources.KmsKey);

        const someRole: Role = blueprints.getResource( context => new Role(context.scope, "some-role", { assumedBy: new ServicePrincipal("sns.amazon.com")}));
        
        const builder = EksBlueprint.builder()
            .resourceProvider(GlobalResources.KmsKey, new CreateKmsKeyProvider())
            .account("123456789012")
            .region("us-east-1")
            .addOns(new AppMeshAddOn( {
                values: {
                    kmsKeyArn: kmsKey.keyArn,
                    someRole: someRole.roleArn 
                }
            }));

        const stack1 = builder.build(app, "resource-deref-cluster");
        const template = Template.fromStack(stack1);
        
        // Then
        logger.debug(template.toJSON());
        expect(JSON.stringify(template.toJSON())).toContain('kmsKeyArn');
    });
});
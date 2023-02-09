import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { Role } from "aws-cdk-lib/aws-iam";
import * as blueprints from "../../lib";
import { EksBlueprint } from "../../lib";
import { cloneDeep } from "../../lib/utils";
import * as nutil from 'node:util/types';

describe("ResourceProxy",() => {

    test("proxy copied as is when cloned", () => {
        
        const proxy = blueprints.getNamedResource("someresourcename");
        console.log(`proxy is ${nutil.isProxy(proxy)}`);
        const values : blueprints.Values = {
            id: 1,
            proxy
        };

        const cloned = cloneDeep(values);
        const fn = cloned.proxy[blueprints.utils.sourceFunction];
        
        expect(fn).toBeDefined();
    });

    test("resource proxy resolves", () => {
        
        const app = new App();
        

        const clusterProvider = new blueprints.GenericClusterProvider({
            version: KubernetesVersion.V1_23,
            mastersRole: blueprints.getResource(context => {
                return Role.fromRoleName(context.scope, "mastersRole", "myrole");
            }),
        });

        const stack = EksBlueprint.builder()
            .clusterProvider(clusterProvider)
            .account("123456789012")
            .region("us-east-1")
            .build(app, "resource-cluster");

        const template = Template.fromStack(stack);
            // Then
        expect(JSON.stringify(template.toJSON())).toContain(':iam::123456789012:role/myrole');
    });

});
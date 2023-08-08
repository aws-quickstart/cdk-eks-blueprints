import { Server, ServerCredentials, handleUnaryCall } from "@grpc/grpc-js";
import * as cdk from "aws-cdk-lib";
import * as eks from 'aws-cdk-lib/aws-eks';
import { EksBlueprint } from "../stacks";
import * as codegen from "../codegen";
import pb = codegen.codegen;
import { VpcProvider } from "../resource-providers";
import { ClusterAddOn, ClusterProvider, ResourceProvider, Team } from "../spi";
import { AckAddOn, AckServiceName, KubeProxyAddOn, CoreDnsAddOn } from "../addons";
import { ApplicationTeam, PlatformTeam } from "../teams";
import { AsgClusterProvider, MngClusterProvider } from "../cluster-providers";
import { BlueprintBuilder } from "../stacks";

const server = new Server();
const app = new cdk.App();
let builders: Array<BlueprintBuilder> = [];

class ClusterServer implements pb.ClusterServiceServer {
    [name: string]: import("@grpc/grpc-js").UntypedHandleCall;
    createCluster: handleUnaryCall<pb.CreateClusterRequest, pb.APIResponse> = (call, callback) => {
        builders.push(EksBlueprint.builder().id(call.request.id));
        let builder = builders.find(builder => builder.props.id == call.request.id)!;
        const response = pb.APIResponse.create();
        builder.id(call.request.id);
        const name = call.request.name ?? call.request.id;
        builder.name(name);

        response.message = `Cluster Created: ${name}`;
        callback(null, response);
    };
    addAckAddOn: handleUnaryCall<codegen.codegen.AddAckAddOnRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;

        builder.addOns(new AckAddOn({
            ...call.request.ackAddOn,
            serviceName: call.request.ackAddOn?.serviceName as AckServiceName
        }));

        response.message = `Added AckAddOn to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addKubeProxyAddOn: handleUnaryCall<codegen.codegen.AddKubeProxyAddOnRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;

        builder.addOns(new KubeProxyAddOn(call.request.kubeProxyAddOn?.version));

        response.message = `Added KubeProxyAddOn to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addCoreDnsAddOn: handleUnaryCall<codegen.codegen.AddCoreDNSAddOnRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;

        builder.addOns(new CoreDnsAddOn(call.request.coreDnsAddOn?.version));

        response.message = `Added CoreDNSAddOn to cluster: ${builder.props.name}`;
        callback(null, response);
    }
    addAddons: handleUnaryCall<pb.AddAddonsRequest, pb.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const addons: Array<ClusterAddOn> = [];
        call.request.addons.forEach(addon => {
            if(addon.ackAddOn) {
                addons.push(new AckAddOn({
                    ...addon.ackAddOn,
                    serviceName: addon.ackAddOn.serviceName as AckServiceName
                }));
            }

        });
        builder.addOns(...addons);
        response.message = `Added ${addons.length} Addons to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addPlatformTeam: handleUnaryCall<codegen.codegen.AddPlatformTeamRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const team = new PlatformTeam(call.request.props!);
        builder.teams(team);

        response.message = `Added Platform Team ${team.name} to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addApplicationTeam: handleUnaryCall<codegen.codegen.AddApplicationTeamRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const team = new ApplicationTeam(call.request.props!);
        builder.teams(team);

        response.message = `Added Application Team ${team.name} to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addTeams: handleUnaryCall<pb.AddTeamsRequest, pb.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const teams: Array<Team> = [];
        call.request.teams.forEach(team => {
            if(team.applicationTeam){
                teams.push(new ApplicationTeam(team.applicationTeam));
            }
            if(team.platformTeam){
                teams.push(new PlatformTeam(team.platformTeam));
            }
        });

        response.message = 'Added teams to cluster: ' + teams.map(team => team.name).join(" ");
        builder.teams(...teams);
        callback(null, response);
    };

    addMngClusterProvider: handleUnaryCall<codegen.codegen.AddMngClusterProviderRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        builder.clusterProvider(new MngClusterProvider({
            ...call.request.mngClusterProvider,
            version: eks.KubernetesVersion.of(call.request.mngClusterProvider?.version ?? "undefined"),
        }));

        response.message = `Added MngClusterProvider to cluster: ${builder.props.name}`;
        callback(null, response);
    };

    addAsgClusterProvider: handleUnaryCall<codegen.codegen.AddAsgClusterProviderRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        builder.clusterProvider(new AsgClusterProvider({
            ...call.request.asgClusterProvider,
            version: eks.KubernetesVersion.of(call.request.asgClusterProvider?.version ?? "undefined"),
            id: call.request.asgClusterProvider?.id ?? call.request.clusterName,
        }));

        response.message = `Added AsgClusterProvider to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addClusterProvider: handleUnaryCall<pb.AddClusterProviderRequest, pb.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const reqClusterProvider = call.request.clusterProvider;
        let clusterProvider: ClusterProvider | undefined;
        let type: string = "";
        const version = reqClusterProvider?.asgClusterProvider?.version ?? reqClusterProvider?.mngClusterProvider?.version ?? "undefined";
        if(reqClusterProvider?.asgClusterProvider) {
            clusterProvider = new AsgClusterProvider(
                {
                    ...reqClusterProvider.asgClusterProvider,
                    version: eks.KubernetesVersion.of(version),
                }
            );
            type = "asg";
        }
        if(reqClusterProvider?.mngClusterProvider) {
            clusterProvider = new MngClusterProvider(
                {...reqClusterProvider.mngClusterProvider, 
                    version: eks.KubernetesVersion.of(version),
                },
            );
            type = "mng";
        }
        builder.clusterProvider(clusterProvider!);
        response.message = `Added ClusterProvider to cluster: ${type}`;
        callback(null, response);
    };
    addVpcProvider: handleUnaryCall<codegen.codegen.AddVpcProviderRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;

        builder.resourceProvider(call.request.name, new VpcProvider(call.request.vpcProvider?.vpcId));

        response.message = `Added VpcProvider to cluster: ${builder.props.name}`;
        callback(null, response);
    };
    addResourceProvider: handleUnaryCall<pb.AddResourceProviderRequest, pb.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const reqResourceProvider = call.request.resourceProvider; 
        let resourceProvider: ResourceProvider | undefined;
        let name = call.request.name;
        if(reqResourceProvider?.vpcProvider) {
            resourceProvider = new VpcProvider(reqResourceProvider.vpcProvider.vpcId);
        }

        builder.resourceProvider(name, resourceProvider!);
        response.message = `Added Resource provider to cluster: ${name}`;
        callback(null, response);
    };
    cloneCluster: handleUnaryCall<codegen.codegen.CloneClusterRequest, codegen.codegen.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const num = builders.push(builder.clone(call.request.region, call.request.account));
        let new_builder = builders.at(num);
        new_builder?.id(call.request.newClusterId);
        new_builder?.name(call.request.newClusterName?? new_builder.props.id ?? "");

        response.message = `Cloned cluster ${builder.name} to ${new_builder?.props.name}`;
        callback(null, response);
    };
    buildCluster: handleUnaryCall<pb.BuildClusterRequest, pb.APIResponse> = (call, callback) => {
        const response = pb.APIResponse.create();
        let builder = builders.find(builder => builder.props.name == call.request.clusterName)!;
        const name = call.request.clusterName;
        const account = call.request.account ?? process.env.CDK_DEFAULT_ACCOUNT!;
        const region =  call.request.region ?? process.env.CDK_DEFAULT_REGION!;

        builder
            .account(account)
            .region(region)
            .build(app, builder.props.id!);
        app.synth();

        response.message = `Cluster ${name} Built: ${account}:${region}`;

        callback(null, response);

    };

}

server.addService(pb.ClusterServiceService, new ClusterServer());
server.bindAsync('0.0.0.0:50051', ServerCredentials.createInsecure(), () => {
    server.start();
    console.log('server is running on 0.0.0.0:50051');
});

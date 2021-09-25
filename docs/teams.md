# Teams

The `cdk-eks-blueprint` framework provides support for onboarding, managing, and configuring cluster access. It supports two team types: `ApplicationTeam` and `PlatformTeam`. `ApplicationTeam` manages workloads that run in cluster namespaces, and `PlatformTeam` is a platform for administrators who have access (masters group) to clusters.

You can create your own team implementations by creating classes that inherit from `ApplicationTeam`.

### ApplicationTeam class

To create an application team, implement a class that extends `ApplicationTeam`. You must supply a team name and an array of users.

```typescript
export class TeamAwesome extends ApplicationTeam {
    constructor(app: App) {
        super({
            name: "team-awesome",
            users: [
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user1`),
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user2`)
            ]

        });
    }
}
```

The `ApplicationTeam` class does the following:

- Creates a namespace.
- Registers quotas.
- Registers IAM users for cross-account access.
- Creates a shared role for cluster access. Optionally, an existing role can be used.
- Registers users and roles in the `awsAuth` map for Kubectl.
- Provides console access to the cluster and namespace.

### PlatformTeam class

To create a platform team, implement a class that extends `PlatformTeam`. You must supply a team name and an array of users.  

```typescript
export class TeamAwesome extends PlatformTeam {
    constructor(app: App) {
        super({
            name: "team-awesome",
            users: [
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user1`),  
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user2`)
            ]

        });
    }
}
```
The `PlatformTeam` class does the following:

 - Registers IAM users for administrator access to the cluster (Kubectl and console).
 - Registers an existing role (or creates a new role) for cluster access.
 
To reduce verbosity for some use cases, such as for platform teams, the following use case enables administrator cluster access for a specific role, and the blueprint provides add-hoc support for creating teams:

```typescript
const adminTeam = new PlatformTeam( {
    name: "second-adminteam", // make sure this is unique within organization
    userRole: Role.fromRoleArn(`${YOUR_ROLE_ARN}`);
})
```

### DefaultTeamRoles class

The `DefaultTeamRoles` class provides a default RBAC configuration for `ApplicationTeams`:

 - Cluster role, group identity, and cluster role bindings for viewing nodes and namespaces.
 - Namespace role and role binding for the group to view pods, deployments, DaemonSets, and services.

## Team benefits 

Managing teams using infrastrucutre as code provides the following benefits:

1. Self-documenting code.
2. Centralized logic related to the team.
3. A location to add additional provisioning, such as adding Kubernetes service accounts and/or infrastructure (for example, to an S3 bucket).
4. IDE support to locate a team (for example, `CTRL+T` in VS Code to look up a class name).

The previous example is intended for a platform team, but it can be applied to a team with restricted access. 

## Cluster access (Kubectl)

The stack output contains the `kubeconfig` update command, which should be shared with development and platform teams.

```
${teamname}teamrole	arn:aws:iam::${account}:role/west-dev-${teamname}AccessRole3CDA6927-1QA4S3TYMY36N

platformteamadmin	arn:aws:iam::${account}:role/west-dev-${platform-team-name}AccessRole57468BEC-8JYMM0HZZ2CE	

teamtroisaiamrole	arn:aws:iam::${account}:role/west-dev-westdevinfbackendRole861AD63A-2K9W8X4DDF46

westdevConfigCommand1AE70258	aws eks update-kubeconfig --name west-dev --region us-west-1 --role-arn arn:aws:iam::${account}:role/west-dev-westdevMastersRole509E4B82-101MDZNTGFF08
```

Note that these commands update `kubeconfig` with the proper context to access clusters through Kubectl. The last argument of this command is `--role-arn`, which by default is set to the cluster master role. 

Developers (members of each team) should use the role name for the team role, such as `burnhamteamrole` for team name `burnham`. 
Platform administrators must use the role output for their team name, such as `platformteamadmin` in the previous example.

## Console access

If each team recieves the role name created for cluster access, each team member in the users section can assume the role in the target account. To do this, use the `Switch Roles` function in the console, and specify the role. This enables Amazon EKS console access to list clusters and get console visibility into the workloads that belong to the team. 

## Examples

There are a few team examples in the `/teams` folder. The example for `team-burnham` includes a way to specify IAM users through a local or project CDK context. Project context is defined in `cdk.json` under the context key, and local context is defined in `~/.cdk.json` under the context key. 

For example:

```
➜ cat ~/.cdk.json 
{
    "context": {
        "team-burnham.users": "arn:aws:iam::YOUR_ACCOUNT:user/dev1,arn:aws:iam::YOUR_ACCOUNT:user/dev2"
    }
}
```
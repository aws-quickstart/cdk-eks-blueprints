# Teams

The `eks-blueprints` framework provides support for onboarding and managing teams and easily configuring cluster access. We currently support two `Team` types: `ApplicationTeam` and `PlatformTeam`. `ApplicationTeam` represent teams managing workloads running in cluster namespaces and `PlatformTeam` represents platform administrators who have admin access (masters group) to clusters.

You are also able to create your own team implementations by creating classes that inherits from `Team`.

### ApplicationTeam 

To create an `ApplicationTeam` for your cluster, simply implement a class that extends `ApplicationTeam`. You will need to supply a team name, an array of users, and (optionally) a directory where you may optionally place any policy definitions and generic manifests for the team. These manifests will be applied by the platform and will be outside of the team control **NOTE:** When the manifests are applied, namespaces are not checked. Therefore, you are responsible for namespace settings in the yaml files.

```typescript
export class TeamAwesome extends ApplicationTeam {
    constructor(app: App) {
        super({
            name: "team-awesome",
            users: [
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user1`),  
                new ArnPrincipal(`arn:aws:iam::${YOUR_IAM_ACCOUNT}:user/user2`)
            ],
            teamManifestDir: './examples/teams/team-awesome/'
        });
    }
}
```

The `ApplicationTeam` will do the following:

- Create a namespace
- Register quotas
- Register IAM users for cross-account access
- Create a shared role for cluster access. Alternatively, an existing role can be supplied.
- Register provided users/role in the `awsAuth` map for `kubectl` and console access to the cluster and namespace.
- (Optionally) read all additional manifests (e.g., network policies, OPA policies, others) stored in a provided directory, and applies them.

### PlatformTeam 

To create an `PlatformTeam` for your cluster, simply implement a class that extends `PlatformTeam`. You will need to supply a team name and an array of users.  

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

 - registers IAM users for admin access to the cluster (`kubectl` and console)
 - registers an existing role (or create a new role) for cluster access with trust relationship with the provided/created role
 
To reduce verbosity for some of the use cases, such as for platform teams, when in reality the use case is simply to enable admin cluster access for a specific role the blueprint provides support for add-hoc team creation as well. For example:

```typescript
const adminTeam = new PlatformTeam( {
    name: "second-adminteam", // make sure this is unique within organization
    userRoleArn: `${YOUR_ROLE_ARN}`;
})
```

### DefaultTeamRoles 

The `DefaultTeamRoles` class provides default RBAC configuration for `ApplicationTeams`:

 - Cluster role, group identity and cluster role bindings to view nodes and namespaces
 - Namespace role and role binding for the group to view pods, deployments, daemonsets, services

## Team Benefits 

By managing teams via infrastructure as code, we achieve the following benefits:

1. Self-documenting code
2. Centralized logic related to the team
3. Clear place where to add additional provisioning, for example adding Kubernetes Service Accounts and/or infrastructure, such as S3 buckets
4. IDE support to locate the required team, e.g. CTRL+T in VSCode to lookup class name.

The example above is shown for a platform team, but it could be similarly applied to a regular team with restricted access. 

## Cluster Access (`kubectl`)

The stack output will contain the `kubeconfig` update command, which should be shared with the development and platform teams.

```
${teamname}teamrole	arn:aws:iam::${account}:role/west-dev-${teamname}AccessRole3CDA6927-1QA4S3TYMY36N

platformteamadmin	arn:aws:iam::${account}:role/west-dev-${platform-team-name}AccessRole57468BEC-8JYMM0HZZ2CE	

teamtroisaiamrole	arn:aws:iam::${account}:role/west-dev-westdevinfbackendRole861AD63A-2K9W8X4DDF46

westdevConfigCommand1AE70258	aws eks update-kubeconfig --name west-dev --region us-west-1 --role-arn arn:aws:iam::${account}:role/west-dev-westdevMastersRole509E4B82-101MDZNTGFF08
```

Note the last command is to update `kubeconfig` with the proper context to access cluster using `kubectl`. The last argument of this command is `--role-arn` which by default is set to the cluster master role. 

Developers (members of each team) should use the role name for the team role, such as `burnhamteamrole` for team name `burnham`. 
Platform administrators must use the role output for their team name, such as platformteamadmin in the above example.

## Console Access

Provided that each team has received the name of the role that was created for the cluster access, each team member listed in the users section will be able to assume the role in the target account. 

To do that, users should use "Switch Roles" function in the console and specify the provided role. This will enable EKS console access to list clusters and to get console visibility into the workloads that belong to the team. 

## Examples

There are a few team examples under /teams folder.

The example for team-burnham includes a way to specify IAM users through a local or project CDK context. 
Project context is defined in `cdk.json` under context key and local context is defined in `~/.cdk.json` under context key. 

Example:

```
➜ cat ~/.cdk.json 
{
    "context": {
        "team-burnham.users": "arn:aws:iam::YOUR_ACCOUNT:user/dev1,arn:aws:iam::YOUR_ACCOUNT:user/dev2"
    }
}
```
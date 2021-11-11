# Description

This is an internal readme for development processes that should be followed for this repository.

## Local Development

This project leverage Makefiles for project automation. We currently support the following commands.

Lint the project with `ESLint`. 

```
make lint
```

Build the project with `Typescript`. 

```
make build.
```

## Triggering E2E Testing

The CI system attached to the project will run all stacks under examples as end-to-end integration testing. 

Currently it works the following way:

- A human maintainer reviews the pr code to ensure it is not malicious 
- If the code is trusted and the maintainer wishes to run e2e tests, they comment on the pr with /do-e2e-tests. This will trigger the build and test. Any visibility into the state can only occur through AWS maintainers.
- If job succeeds, the CI bot approves the PR. If it fails it requests changes. Details on what failed will need to be manually shared with external contributors.
- At present shapirov103, kcoleman731 and askulkarni2 have rights to invoke the bot. 

## Publishing

At the moment leveraging a private NPM repository for "shapirov". TODO: move under aws-labs.

1. Change version in package.json. We are currently using <major>.<minor>.<patch>, e.g. 0.1.5
   1. Patch version increment must be used for bug fixes, including changes in code and missing documentation.
   2. Minor version is used for new features that do not change the way customers interact with the solution. For example, new add-on, extra configuration (optional) for existing add-ons. In some cases it may be used with CDK version upgrades provided they don't cause code changes.
   3. Major version is used for non-compatible changes that will require customers to re-arch. With the exception of version 1. which will be used once the code is production ready (we have tests, pipeline, validation).
2. Publishing (if not applied through CI):
   1. `make build` (compile)
   2. `npm publish` (this will require credentials to npm)
   
## Submitting Changes

For   direct contributors:
1. Create a feature branch and commit to that branch.
2. Create PR to the main branch. 
3. After review if approved changes will be merged.

For external contributors:
1. Create a fork of the repository
2. Submit a PR with the following:
   1. Clear description of the feature
   2. Test coverage
   3. Validation instructions
   
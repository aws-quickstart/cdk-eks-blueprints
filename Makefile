#!/bin/bash

# Libraries
TSC := node node_modules/.bin/tsc
ESLINT := node node_modules/.bin/eslint
CDK := npx cdk
COPY := node node_modules/.bin/copyfiles
THIS_FILE := $(lastword $(MAKEFILE_LIST))

# Dependecies
HOMEBREW_LIBS :=  nvm typescript argocd

deps: 
	npm install

lint: 
	$(ESLINT) . --ext .js,.jsx,.ts,.tsx

build:
	rm -rf dist 
	@$(MAKE) -f $(THIS_FILE) compile

compile:
	$(TSC)
	@$(MAKE) -f $(THIS_FILE) copyfiles

copyfiles:
	$(COPY) "lib/**/*.yaml" "lib/**/*.ytpl" "dist/" -u 1 -V -E

list:
	$(DEPS)
	$(CDK) list

run-test:
	npm test

synth:
	$(DEPS)
	$(CDK) synth

bootstrap-cdk:
	aws cloudformation describe-stacks \
		--stack-name CDKToolkit \
		--region ${AWS_REGION} || \
		CDK_NEW_BOOTSTRAP=1 $(CDK) bootstrap \
			aws://$(aws sts get-caller-identity --output text --query Account --region ${AWS_REGION})/${AWS_REGION}

deploy-all:
	$(DEPS)
	$(CDK) deploy --verbose --all --require-approval never

destroy-all:
	$(CDK) destroy --verbose --all --force

mkdocs:
	npx typedoc --out docs/api lib/index.ts
	mkdocs serve 

push-mkdocs:
	npx typedoc --out docs/api lib/index.ts
	mkdocs gh-deploy

bootstrap:
	@for LIB in $(HOMEBREW_LIBS) ; do \
		LIB=$$LIB make check-lib ; \
    done

check-lib:
ifeq ($(shell brew ls --versions $(LIB)),)
	@echo Installing $(LIB) via Hombrew
	@brew install $(LIB)
else
	@echo $(LIB) is already installed, skipping.
endif

clean:
	rm -rf node_modules && rm -f package-lock.json

updates:
	npm install -g npm-check-updates
	npx npm-check-updates -u
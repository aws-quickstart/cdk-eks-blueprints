#!/bin/bash

# Libraries
TSC := node node_modules/.bin/tsc
ESLINT := node node_modules/.bin/eslint
CDK := node node_modules/.bin/cdk
COPY := node node_modules/.bin/copyfiles

# Dependecies
HOMEBREW_LIBS :=  nvm typescript argocd

deps: 
	npm install

lint: 
	$(ESLINT) . --ext .js,.jsx,.ts,.tsx

build:
	rm -rf dist && $(TSC)
	$(COPY) lib/**/*.yaml dist/ -u 1

list: 
	$(CDK) list

synth: 
	$(CDK) synth

mkdocs:
	mkdocs serve 

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
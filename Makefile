TSC := node node_modules/.bin/tsc
ESLINT := node node_modules/.bin/eslint

lint: 
	$(ESLINT) . --ext .js,.jsx,.ts,.tsx

build: lint
	rm -rf dist && $(TSC)

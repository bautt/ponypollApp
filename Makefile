.PHONY: deps dev build package

APP_NAME = ponypollapp

deps:
	cd src/ && yarn install

dev:
	cd src/ && NODE_ENV=development yarn webpack --config webpack.config.mjs --watch

build:
	rm -rf dist
	cd src/ && NODE_ENV=production yarn webpack --config webpack.config.mjs

package: build
	rm -rf /tmp/$(APP_NAME)
	cp -r dist/ /tmp/$(APP_NAME)
	COPYFILE_DISABLE=1 COPY_EXTENDED_ATTRIBUTES_DISABLE=1 tar \
	--format=ustar \
	--no-xattrs \
	--exclude='.DS_Store' \
	--exclude='.gitkeep' \
	--exclude='local.meta' \
	--exclude='__pycache__' \
	--exclude='./$(APP_NAME)/local' \
	--exclude='*.pyc' \
	--exclude='*.bak' \
	-cvzf $(APP_NAME).tar.gz \
	-C /tmp \
	$(APP_NAME)/

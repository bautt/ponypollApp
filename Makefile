.PHONY: deps dev build package appinspect appinspect-deps

APP_NAME = ponypollapp
APPINSPECT_VENV = .venv-appinspect
APPINSPECT = $(APPINSPECT_VENV)/bin/splunk-appinspect

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

# One-time: create the AppInspect venv (requires Python 3).
appinspect-deps:
	test -d $(APPINSPECT_VENV) || python3 -m venv $(APPINSPECT_VENV)
	$(APPINSPECT_VENV)/bin/pip install -q -r requirements.txt

# Splunk Cloud vetting checks (242 checks). Builds the tarball first.
appinspect: appinspect-deps package
	$(APPINSPECT) inspect $(APP_NAME).tar.gz \
		--mode precert \
		--included-tags cloud
